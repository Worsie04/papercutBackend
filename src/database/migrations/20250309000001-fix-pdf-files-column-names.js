'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if the old columns exist before attempting to rename them
      const tableInfo = await queryInterface.describeTable('pdf_files');
      
      // Only attempt to rename columns that exist in the current table
      if (tableInfo.recordId) {
        await queryInterface.renameColumn('pdf_files', 'recordId', 'record_id');
      }
      
      if (tableInfo.originalFileName) {
        await queryInterface.renameColumn('pdf_files', 'originalFileName', 'original_file_name');
      }
      
      if (tableInfo.filePath) {
        await queryInterface.renameColumn('pdf_files', 'filePath', 'file_path');
      }
      
      if (tableInfo.fileSize) {
        await queryInterface.renameColumn('pdf_files', 'fileSize', 'file_size');
      }
      
      if (tableInfo.fileHash) {
        await queryInterface.renameColumn('pdf_files', 'fileHash', 'file_hash');
      }
      
      if (tableInfo.pageCount) {
        await queryInterface.renameColumn('pdf_files', 'pageCount', 'page_count');
      }
      
      if (tableInfo.extractedText) {
        await queryInterface.renameColumn('pdf_files', 'extractedText', 'extracted_text');
      }
      
      if (tableInfo.extractedMetadata) {
        await queryInterface.renameColumn('pdf_files', 'extractedMetadata', 'extracted_metadata');
      }
      
      // Check if timestamps are in camelCase too
      if (tableInfo.createdAt) {
        await queryInterface.renameColumn('pdf_files', 'createdAt', 'created_at');
      }
      
      if (tableInfo.updatedAt) {
        await queryInterface.renameColumn('pdf_files', 'updatedAt', 'updated_at');
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Migration error:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Revert column names back to camelCase if needed
      const tableInfo = await queryInterface.describeTable('pdf_files');
      
      if (tableInfo.record_id) {
        await queryInterface.renameColumn('pdf_files', 'record_id', 'recordId');
      }
      
      if (tableInfo.original_file_name) {
        await queryInterface.renameColumn('pdf_files', 'original_file_name', 'originalFileName');
      }
      
      if (tableInfo.file_path) {
        await queryInterface.renameColumn('pdf_files', 'file_path', 'filePath');
      }
      
      if (tableInfo.file_size) {
        await queryInterface.renameColumn('pdf_files', 'file_size', 'fileSize');
      }
      
      if (tableInfo.file_hash) {
        await queryInterface.renameColumn('pdf_files', 'file_hash', 'fileHash');
      }
      
      if (tableInfo.page_count) {
        await queryInterface.renameColumn('pdf_files', 'page_count', 'pageCount');
      }
      
      if (tableInfo.extracted_text) {
        await queryInterface.renameColumn('pdf_files', 'extracted_text', 'extractedText');
      }
      
      if (tableInfo.extracted_metadata) {
        await queryInterface.renameColumn('pdf_files', 'extracted_metadata', 'extractedMetadata');
      }
      
      if (tableInfo.created_at) {
        await queryInterface.renameColumn('pdf_files', 'created_at', 'createdAt');
      }
      
      if (tableInfo.updated_at) {
        await queryInterface.renameColumn('pdf_files', 'updated_at', 'updatedAt');
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Migration reversion error:', error);
      return Promise.reject(error);
    }
  }
};