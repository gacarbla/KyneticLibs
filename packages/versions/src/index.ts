export class VersionManager {
    private _versionRules: Record<string, (string | number)[]> = {
        'x': [ '\\d+' ],
        'g': [ 'α','β','γ','δ','ε','ζ','η','θ','ι','κ','λ','μ','ν','ξ','ο','π','ρ','σ','τ','υ','φ','χ','ψ','ω' ],
        's': [ '!','@','#','$','%','^','&','*','(',')','-','=','+' ],
        'G': [ 'alpha','beta','gamma','delta','epsilon','zeta','eta','theta','iota','kappa','lambda','mu','nu','xi','omicron','pi','rho','sigma','tau','upsilon','phi','chi','psi','omega' ],
        'w': [ '\\w+' ],
    };

    constructor(readonly versionSchema: string = 'x.x.(x|w)(.(g|G))?', private currentVersion: string = '0.0.1') {
        const regex = this.parseVersionSchema();
        if (!regex.test(this.currentVersion)) {
            throw new Error(`Current version "${this.currentVersion}" does not match the version schema "${this.versionSchema}".`);
        }
    }

    get versionRules() {
        return this._versionRules;
    }

    get version() {
        return this.currentVersion;
    }

    addVersionRule(key: string, rules: (string | number)[]) {
        if (this._versionRules[key]) {
            throw new Error(`Version rule for key "${key}" already exists.`);
        }
        this._versionRules[key] = rules;
    }

    private parseVersionSchema() {
        var regexString = this.versionSchema;
        (Object.keys(this._versionRules) as string[]).forEach((key) => {
            const rules = this._versionRules[key];
            regexString = regexString.replace(new RegExp(key, 'g'), `(${rules.map(String).join('|')})`);
        });
        return new RegExp(`^${regexString}$`, 'u'); 
    }

    setVersion(newVersion: string) {
        const regex = this.parseVersionSchema();
        if (!regex.test(newVersion)) {
            throw new Error(`New version "${newVersion}" does not match the version schema "${this.versionSchema}".`);
        } else {
            this.currentVersion = newVersion;
        }
    }
}

export default VersionManager;