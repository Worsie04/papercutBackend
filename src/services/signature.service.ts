import { Signature, SignatureType } from '../models/signature.model';
import { AppError } from '../presentation/middlewares/errorHandler';
import { StatusCodes } from 'http-status-codes';
import { S3Client, PutObjectCommand, DeleteObjectCommand, PutObjectCommandInput } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUB_URL = process.env.R2_PUB_URL;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUB_URL) {
    console.error("Cloudflare R2 environment variables are not fully set!");
}

const s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
});

interface UploadedFileMetadata {
    filename: string;
    storageKey: string;
    publicUrl: string;
    size?: number;
    mimeType?: string;
}

export class SignatureService {

    async listUserSignatures(userId: string): Promise<Pick<Signature, 'id' | 'filename' | 'publicUrl' | 'signatureType' | 'createdAt'>[]> {
        try {
            const signatures = await Signature.findAll({
                where: { userId: userId },
                order: [['createdAt', 'DESC']],
                attributes: ['id', 'filename', 'publicUrl', 'signatureType', 'createdAt'],
            });
            return signatures;
        } catch (error) {
            console.error('Error fetching user signatures:', error);
            throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Could not retrieve signatures.');
        }
    }

    async uploadSignature(
        userId: string,
        file: Express.Multer.File,
        signatureType: SignatureType = SignatureType.UPLOADED
    ): Promise<Signature> {
        if (!file) {
            throw new AppError(StatusCodes.BAD_REQUEST, 'No file uploaded.');
        }
        if (!R2_BUCKET_NAME || !R2_PUB_URL) {
            throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'R2 bucket name or public URL is not configured.');
        }

        const fileExtension = path.extname(file.originalname);
        const uniqueFilename = `${uuidv4()}${fileExtension}`;
        const storageKey = `signatures/user-${userId}/${uniqueFilename}`;

        const uploadParams: PutObjectCommandInput = {
            Bucket: R2_BUCKET_NAME,
            Key: storageKey,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read',
        };

        let uploadedFileMeta: UploadedFileMetadata;
        try {
            console.log(`Uploading ${file.originalname} to R2 bucket ${R2_BUCKET_NAME} as ${storageKey}`);
            await s3Client.send(new PutObjectCommand(uploadParams));

            const r2PubUrlBase = R2_PUB_URL!.endsWith('/') ? R2_PUB_URL!.slice(0, -1) : R2_PUB_URL!;
            const sKey = storageKey.startsWith('/') ? storageKey.slice(1) : storageKey;
            const publicUrlWithProtocol = `https://${r2PubUrlBase}/${sKey}`;

            uploadedFileMeta = {
                filename: file.originalname,
                storageKey: storageKey,
                publicUrl: publicUrlWithProtocol,
                size: file.size,
                mimeType: file.mimetype,
            };
            console.log('Upload to R2 successful, Full Public URL:', uploadedFileMeta.publicUrl);

        } catch (uploadError) {
            console.error('Error uploading to R2:', uploadError);
            throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to upload signature to storage.');
        }

        try {
            const newSignatureRecord = await Signature.create({
                userId,
                filename: uploadedFileMeta.filename,
                storageKey: uploadedFileMeta.storageKey,
                publicUrl: uploadedFileMeta.publicUrl,
                size: uploadedFileMeta.size,
                mimeType: uploadedFileMeta.mimeType,
                signatureType,
            });
            return newSignatureRecord;
        } catch (dbError) {
            console.error('Error saving signature metadata to DB:', dbError);
            try {
                await s3Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: storageKey }));
                console.log(`Rolled back: Deleted ${storageKey} from R2 due to DB error.`);
            } catch (rollbackError) {
                console.error(`Failed to rollback R2 deletion for ${storageKey}:`, rollbackError);
            }
            throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to save signature information after upload.');
        }
    }

    async deleteSignature(userId: string, signatureId: string): Promise<void> {
        try {
            const signatureRecord = await Signature.findOne({
                where: { id: signatureId, userId: userId }
            });

            if (!signatureRecord) {
                throw new AppError(StatusCodes.NOT_FOUND, 'Signature not found or access denied.');
            }
            if (!R2_BUCKET_NAME) {
                throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'R2 bucket name is not configured.');
            }

            const deleteParams = {
                Bucket: R2_BUCKET_NAME,
                Key: signatureRecord.storageKey,
            };

            try {
                console.log(`Deleting signature ${signatureRecord.storageKey} from R2 bucket ${R2_BUCKET_NAME}`);
                await s3Client.send(new DeleteObjectCommand(deleteParams));
                console.log('Deletion from R2 successful.');
            } catch (storageError) {
                console.error(`Failed to delete signature ${signatureRecord.storageKey} from R2. Proceeding to delete DB record.`, storageError);
            }

            await signatureRecord.destroy();
            console.log(`Signature record ${signatureId} deleted from DB.`);

        } catch (error) {
            if (error instanceof AppError) throw error;
            console.error('Error deleting signature:', error);
            throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Could not delete signature.');
        }
    }

    async getSignatureById(userId: string, signatureId: string): Promise<Signature> {
        try {
            const signature = await Signature.findOne({
                where: { id: signatureId, userId: userId }
            });

            if (!signature) {
                throw new AppError(StatusCodes.NOT_FOUND, 'Signature not found or access denied.');
            }

            return signature;
        } catch (error) {
            if (error instanceof AppError) throw error;
            console.error('Error fetching signature by ID:', error);
            throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Could not retrieve signature.');
        }
    }
}

export const signatureService = new SignatureService(); 