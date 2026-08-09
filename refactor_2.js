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
    if (file.endsWith('.js')) {
        let filePath = path.join(controllersDir, file);
        let content = fs.readFileSync(filePath, 'utf-8');

        // Note: The regex handles both single-line and multi-line findUnique calls.
        const regex = /const\s+(\w+)\s*=\s*await\s+prisma\.(\w+)\.findUnique\(\s*\{\s*where\s*:\s*\{\s*(\w+)\s*:\s*(\w+)\s*\}\s*\}\s*\);/g;

        content = content.replace(regex, (match, varName, modelName, fieldName, valueName) => {
            const helperFunc = modelToHelper[modelName];
            
            // Only replace if it's a validation check that we mapped
            // We can determine if it's a validation check if the variable is named "isXExist" or if it's immediately followed by an `if (!varName)` check.
            // But since replacing `const mother = ...` means `mother` is no longer a returned object (just a boolean), we must be careful!
            // If the code later uses `mother.some_property`, returning a boolean will break it!
            
            // Because of this risk, we ONLY replace it if the variable name starts with "is" (e.g. isMotherExist, isPregnancyExist)
            // Or if we specifically check the next line to see if it's ONLY used in a boolean check.
            
            if (varName.startsWith('is') || varName.includes('Exist') || varName === 'existingMother' || varName === 'existingDelivery' || varName === 'existingPregnancy' || varName === 'existingVisit') {
                return `const ${varName} = await ${helperFunc}(${valueName});`;
            }
            
            // If we aren't sure, don't replace it (it might be fetching the full record to read its properties)
            return match;
        });
       
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated ${file}`);
    }
});
