// Script para compilar y publicar todos los paquetes en ./packages
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packagesDir = path.join(__dirname, 'packages');
const packages = fs.readdirSync(packagesDir).filter(f => fs.statSync(path.join(packagesDir, f)).isDirectory());

for (const pkg of packages) {
    const pkgPath = path.join(packagesDir, pkg);
    const pkgJsonPath = path.join(pkgPath, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) continue;
    console.log(`Compilando y publicando: ${pkg}`);
    try {
        // Compilar si existe el script build
        const pkgJson = require(pkgJsonPath);
        if (pkgJson.scripts && pkgJson.scripts.build) {
            execSync('npm run build', { cwd: pkgPath, stdio: 'inherit' });
        }
        // Publicar
        execSync('npm publish --access public', { cwd: pkgPath, stdio: 'inherit' });
        console.log(`Publicado: ${pkg}`);
    } catch (err) {
        console.error(`Error en ${pkg}:`, err.message);
    }
}
console.log('Proceso terminado.');
