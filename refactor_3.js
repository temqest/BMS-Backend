const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'controllers');
const files = fs.readdirSync(controllersDir);

const modelToHelper = {
    'user': 'isUserExist',
    'mother': 'isMotherExist',
    'pregnancy': 'isPregnancyExist',
    'facility': 'isFacilityExist',
    'prenatalVisit': 'isPrenatalVisitExist',
    'delivery_Outcome': 'isDeliveryOutcomeExist',
    'newborn_Record': 'isNewbornExist',
    'postpartum_visit': 'isPostpartumVisitExist',
    'lab_Screening': 'isLabScreeningExist',
    'immunization_Record': 'isImmunizationRecordExist',
    'supplementation_Record': 'isSupplementRecordExist',
    'notification': 'isNotificationExist'
};

files.forEach(file => {
    if (file.endsWith('.js') && file !== 'notificationController.js') { // we already refactored notificationController.js
        let filePath = path.join(controllersDir, file);
        let content = fs.readFileSync(filePath, 'utf-8');

        // 1. Add imports
        const importsToAdd = `const { isUserExist, isMotherExist, isPregnancyExist, isFacilityExist, isPrenatalVisitExist, isDeliveryOutcomeExist, isNewbornExist, isPostpartumVisitExist, isLabScreeningExist, isImmunizationRecordExist, isSupplementRecordExist, isNotificationExist } = require('../util/validation');\n`;
        
        if (!content.includes('require(\'../util/validation\')')) {
            content = content.replace(/const prisma = require\('\.\.\/util\/db'\);?/, `const prisma = require('../util/db');\n${importsToAdd}`);
        }

        // 2. Fix 400 -> 404
        content = content.replace(/status\(400\)\.json\(\{\s*error\s*:\s*["']([^"']*(?:Not Found|not found)[^"']*)["']\s*\}\)/gi, 'status(404).json({error: "$1"})');
        content = content.replace(/status\(400\)\.json\(\{\s*error\s*:\s*["']([^"']*(?:Doesn't Exist)[^"']*)["']\s*\}\)/gi, 'status(404).json({error: "$1"})');

        // 3. Replace findUnique blocks
        const regex = /const\s+(\w+)\s*=\s*await\s+prisma\.(\w+)\.findUnique\(\s*\{\s*where\s*:\s*\{\s*(\w+)\s*:\s*(\w+)\s*\}\s*\}\s*\);/g;

        content = content.replace(regex, (match, varName, modelName, fieldName, valueName) => {
            const helperFunc = modelToHelper[modelName];
            
            if (varName.startsWith('is') || varName.includes('Exist') || varName.startsWith('existing') || varName.startsWith('search')) {
                // Return a new safe variable name
                return `const _${varName} = await ${helperFunc}(${valueName});`;
            }
            return match;
        });

        // 4. Replace boolean checks for the old variable names with the new safe variable names
        // e.g. if(!isMotherExist) -> if(!_isMotherExist)
        content = content.replace(/if\s*\(\s*!(\w*(?:Exist|existing|search)\w*)\s*\)/g, 'if(!_$1)');
       
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated ${file}`);
    }
});
