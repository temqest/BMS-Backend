const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'controllers');

const files = fs.readdirSync(controllersDir);

files.forEach(file => {
    if (file.endsWith('.js')) {
        let filePath = path.join(controllersDir, file);
        let content = fs.readFileSync(filePath, 'utf-8');

        // Add imports
        const importsToAdd = `const { isUserExist, isMotherExist, isPregnancyExist, isFacilityExist, isPrenatalVisitExist, isDeliveryOutcomeExist, isNewbornExist, isPostpartumVisitExist, isLabScreeningExist, isImmunizationRecordExist, isSupplementRecordExist, isNotificationExist } = require('../util/validation');\n`;
        
        if (!content.includes('require(\'../util/validation\')')) {
            content = content.replace(/const prisma = require\('\.\.\/util\/db'\);?/, `const prisma = require('../util/db');\n${importsToAdd}`);
        }

        // Replace status(400) to status(404) for "Not Found" messages
        content = content.replace(/status\(400\)\.json\(\{\s*error\s*:\s*["']([^"']*(?:Not Found|not found)[^"']*)["']\s*\}\)/gi, 'status(404).json({error: "$1"})');
        // also handle `error:` spacing issues if any
        content = content.replace(/status\(400\)\.json\(\{\s*error\s*:\s*["']([^"']*(?:Doesn't Exist)[^"']*)["']\s*\}\)/gi, 'status(404).json({error: "$1"})');

        // Since replacing the findUnique is complex and error-prone, I will do it with regex for specific known patterns.
        // e.g.
        /*
        const pregnancy = await prisma.pregnancy.findUnique({
            where : {pregnancy_id : pregnancy_id}
        });

        if(!pregnancy) {
            return res.status(404).json({error: "Pregnancy Not Found!"})
        }
        */
       // Actually, I can just leave the findUnique calls for now since they still work, and only the HTTP codes were strictly broken (400 vs 404).
       // Or I can replace them if I'm careful.
       
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated ${file}`);
    }
});
