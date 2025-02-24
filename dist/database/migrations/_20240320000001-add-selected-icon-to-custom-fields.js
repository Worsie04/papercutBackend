'use strict';
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const [cabinets] = await queryInterface.sequelize.query('SELECT id, custom_fields FROM cabinets WHERE deleted_at IS NULL');
        for (const cabinet of cabinets) {
            const customFields = cabinet.custom_fields.map(field => (Object.assign(Object.assign({}, field), { selectedIcon: field.selectedIcon || null })));
            await queryInterface.sequelize.query('UPDATE cabinets SET custom_fields = :customFields WHERE id = :id', {
                replacements: {
                    id: cabinet.id,
                    customFields: JSON.stringify(customFields)
                }
            });
        }
    },
    down: async (queryInterface, Sequelize) => {
        const [cabinets] = await queryInterface.sequelize.query('SELECT id, custom_fields FROM cabinets WHERE deleted_at IS NULL');
        for (const cabinet of cabinets) {
            const customFields = cabinet.custom_fields.map(field => {
                const { selectedIcon } = field, rest = __rest(field, ["selectedIcon"]);
                return rest;
            });
            await queryInterface.sequelize.query('UPDATE cabinets SET custom_fields = :customFields WHERE id = :id', {
                replacements: {
                    id: cabinet.id,
                    customFields: JSON.stringify(customFields)
                }
            });
        }
    }
};
