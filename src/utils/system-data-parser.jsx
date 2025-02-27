"use client"

/**
 * Specialized parser for system configuration data
 * This handles the specific format expected for the Smart Patch Simulator
 */
export class SystemDataParser {
    /**
     * Parse and validate the uploaded system configuration file
     * @param {Object|Array} data The parsed data from the file
     * @param {string} fileType The file extension (json, csv, xml)
     * @returns {Object} The processed and validated system data
     * @throws {Error} If the data format is invalid
     */
    static parseSystemData(data, fileType) {
        try {
            // Validate required structure based on file type
            if (fileType === 'json') {
                return this.parseJsonSystemData(data);
            } else if (fileType === 'csv') {
                return this.parseCsvSystemData(data);
            } else if (fileType === 'xml') {
                return this.parseXmlSystemData(data);
            } else {
                throw new Error(`Unsupported file type: ${fileType}`);
            }
        } catch (error) {
            console.error('Error parsing system data:', error);
            throw new Error(`Invalid system configuration format: ${error.message}`);
        }
    }

    /**
     * Parse JSON formatted system data
     * @param {Object} data The JSON data
     * @returns {Object} Structured system configuration
     */
    static parseJsonSystemData(data) {
        // Check if data is null or undefined
        if (!data) {
            throw new Error('JSON data is empty or invalid');
        }

        // Expected structure validation
        if (!data.systemConfig && !data.vulnerabilities) {
            throw new Error('Missing required sections: systemConfig and/or vulnerabilities');
        }

        const systemConfig = data.systemConfig || {};
        const vulnerabilities = data.vulnerabilities || [];

        // Validate subsystems count
        if (!systemConfig.numSubsystems || !Number.isInteger(systemConfig.numSubsystems) || systemConfig.numSubsystems <= 0) {
            throw new Error('Invalid or missing numSubsystems in systemConfig');
        }

        // Validate matrices
        if (!Array.isArray(systemConfig.functionalMatrix) ||
            !Array.isArray(systemConfig.topologyMatrix)) {
            throw new Error('Invalid or missing dependency matrices in systemConfig');
        }

        // Validate matrix dimensions
        const n = systemConfig.numSubsystems;
        if (systemConfig.functionalMatrix.length !== n ||
            systemConfig.topologyMatrix.length !== n) {
            throw new Error(`Matrix dimensions do not match numSubsystems (${n})`);
        }

        for (let i = 0; i < n; i++) {
            if (!Array.isArray(systemConfig.functionalMatrix[i]) || 
                systemConfig.functionalMatrix[i].length !== n) {
                throw new Error(`Functional matrix row ${i} has invalid dimensions`);
            }
            
            if (!Array.isArray(systemConfig.topologyMatrix[i]) || 
                systemConfig.topologyMatrix[i].length !== n) {
                throw new Error(`Topology matrix row ${i} has invalid dimensions`);
            }
            
            // Validate matrix elements are valid numbers
            for (let j = 0; j < n; j++) {
                if (typeof systemConfig.functionalMatrix[i][j] !== 'number') {
                    throw new Error(`Functional matrix element at position [${i},${j}] is not a number`);
                }
                if (typeof systemConfig.topologyMatrix[i][j] !== 'number') {
                    throw new Error(`Topology matrix element at position [${i},${j}] is not a number`);
                }
            }
        }

        // Validate vulnerabilities
        if (!Array.isArray(vulnerabilities)) {
            throw new Error('Vulnerabilities must be an array');
        }

        for (const vul of vulnerabilities) {
            if (typeof vul.subsystemIndex !== 'number' ||
                vul.subsystemIndex < 0 ||
                vul.subsystemIndex >= n) {
                throw new Error(`Invalid subsystemIndex in vulnerability: ${JSON.stringify(vul)}`);
            }

            if (typeof vul.impactScore !== 'number' ||
                vul.impactScore < 0 ||
                vul.impactScore > 10) {
                throw new Error(`Invalid impactScore in vulnerability: ${JSON.stringify(vul)}`);
            }

            if (typeof vul.exploitScore !== 'number' ||
                vul.exploitScore < 0 ||
                vul.exploitScore > 10) {
                throw new Error(`Invalid exploitScore in vulnerability: ${JSON.stringify(vul)}`);
            }

            if (vul.exploitExists !== 0 && vul.exploitExists !== 1) {
                throw new Error(`Invalid exploitExists in vulnerability: ${JSON.stringify(vul)}`);
            }
        }

        // Return structured and validated system config
        return {
            numSubsystems: systemConfig.numSubsystems,
            functionalMatrix: systemConfig.functionalMatrix,
            topologyMatrix: systemConfig.topologyMatrix,
            w1: systemConfig.w1 !== undefined ? systemConfig.w1 : 1,
            w2: systemConfig.w2 !== undefined ? systemConfig.w2 : 1,
            k4: systemConfig.k4 !== undefined ? systemConfig.k4 : 1,
            k5: systemConfig.k5 !== undefined ? systemConfig.k5 : 2,
            vulnerabilities: vulnerabilities
        };
    }

    /**
     * Parse CSV formatted system data
     * @param {Array} data The CSV rows as array of objects
     * @returns {Object} Structured system configuration
     */
    static parseCsvSystemData(data) {
        // Check if data is an array and not empty
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('CSV data is empty or invalid');
        }

        // Extract system configuration
        const configRow = data.find(row => row.type === 'config');
        if (!configRow) {
            throw new Error('Missing configuration row with type=config');
        }

        // Check if numSubsystems exists
        if (!('numSubsystems' in configRow)) {
            throw new Error('Missing numSubsystems in configuration row');
        }

        const numSubsystems = parseInt(configRow.numSubsystems);
        if (isNaN(numSubsystems) || numSubsystems <= 0) {
            throw new Error(`Invalid numSubsystems value: ${configRow.numSubsystems}`);
        }

        // Initialize empty matrices
        const functionalMatrix = Array(numSubsystems)
            .fill(0)
            .map(() => Array(numSubsystems).fill(0));

        const topologyMatrix = Array(numSubsystems)
            .fill(0)
            .map(() => Array(numSubsystems).fill(0));

        // Parse matrices
        const functionalRows = data.filter(row => row.type === 'functional');
        const topologyRows = data.filter(row => row.type === 'topology');

        if (functionalRows.length !== numSubsystems) {
            throw new Error(`Expected ${numSubsystems} functional matrix rows but found ${functionalRows.length}`);
        }
        
        if (topologyRows.length !== numSubsystems) {
            throw new Error(`Expected ${numSubsystems} topology matrix rows but found ${topologyRows.length}`);
        }

        // Validate column headers exist
        for (let j = 0; j < numSubsystems; j++) {
            const colName = `col${j}`;
            if (!functionalRows.every(row => colName in row)) {
                throw new Error(`Missing column ${colName} in functional matrix rows`);
            }
            if (!topologyRows.every(row => colName in row)) {
                throw new Error(`Missing column ${colName} in topology matrix rows`);
            }
        }

        // Fill matrices
        for (let i = 0; i < numSubsystems; i++) {
            for (let j = 0; j < numSubsystems; j++) {
                const colName = `col${j}`;
                const functionalCell = functionalRows[i][colName];
                const topologyCell = topologyRows[i][colName];
                
                const funcValue = parseInt(functionalCell);
                if (isNaN(funcValue)) {
                    throw new Error(`Invalid value in functional matrix at position [${i},${j}]: ${functionalCell}`);
                }
                functionalMatrix[i][j] = funcValue;
                
                const topoValue = parseInt(topologyCell);
                if (isNaN(topoValue)) {
                    throw new Error(`Invalid value in topology matrix at position [${i},${j}]: ${topologyCell}`);
                }
                topologyMatrix[i][j] = topoValue;
            }
        }

        // Parse vulnerabilities
        const vulnerabilityRows = data.filter(row => row.type === 'vulnerability');
        const vulnerabilities = [];

        for (const row of vulnerabilityRows) {
            if (!('subsystemIndex' in row)) {
                throw new Error(`Missing subsystemIndex in vulnerability row: ${JSON.stringify(row)}`);
            }
            
            const subsystemIndex = parseInt(row.subsystemIndex);
            if (isNaN(subsystemIndex) || subsystemIndex < 0 || subsystemIndex >= numSubsystems) {
                throw new Error(`Invalid subsystemIndex in vulnerability: ${row.subsystemIndex}`);
            }

            const impactScore = parseFloat(row.impactScore || 5);
            if (isNaN(impactScore) || impactScore < 0 || impactScore > 10) {
                throw new Error(`Invalid impactScore in vulnerability: ${row.impactScore}`);
            }

            const exploitScore = parseFloat(row.exploitScore || 5);
            if (isNaN(exploitScore) || exploitScore < 0 || exploitScore > 10) {
                throw new Error(`Invalid exploitScore in vulnerability: ${row.exploitScore}`);
            }

            const exploitExists = parseInt(row.exploitExists || 0);
            if (exploitExists !== 0 && exploitExists !== 1) {
                throw new Error(`Invalid exploitExists in vulnerability: ${row.exploitExists}`);
            }

            vulnerabilities.push({
                subsystemIndex,
                impactScore,
                exploitScore,
                exploitExists
            });
        }

        // Return structured and validated system config
        return {
            numSubsystems,
            functionalMatrix,
            topologyMatrix,
            w1: parseFloat(configRow.w1 || 1),
            w2: parseFloat(configRow.w2 || 1),
            k4: parseFloat(configRow.k4 || 1),
            k5: parseFloat(configRow.k5 || 2),
            vulnerabilities
        };
    }

    /**
     * Parse XML formatted system data
     * @param {Object} data The XML data converted to a JSON object
     * @returns {Object} Structured system configuration
     */
    static parseXmlSystemData(data) {
        // Check if data exists
        if (!data || !data.systemConfiguration) {
            throw new Error('XML data is empty or missing systemConfiguration root element');
        }

        // Navigate the XML structure
        const systemConfig = data.systemConfiguration.systemConfig || {};
        const vulnerabilitiesNode = data.systemConfiguration.vulnerabilities || {};

        // Extract numSubsystems
        if (!systemConfig.numSubsystems) {
            throw new Error('Missing numSubsystems in XML');
        }

        // Handle different XML parser outputs (some parsers use arrays, some use objects with #text)
        const getNodeValue = (node) => {
            if (!node) return null;
            if (typeof node === 'string') return node;
            if (node['#text']) return node['#text'];
            if (Array.isArray(node) && node.length > 0) return node[0];
            return null;
        };

        const numSubsystems = parseInt(getNodeValue(systemConfig.numSubsystems));
        if (isNaN(numSubsystems) || numSubsystems <= 0) {
            throw new Error(`Invalid or missing numSubsystems in XML: ${getNodeValue(systemConfig.numSubsystems)}`);
        }

        // Parse matrices
        if (!systemConfig.functionalMatrix || !systemConfig.topologyMatrix) {
            throw new Error('Missing functionalMatrix or topologyMatrix in XML');
        }

        let functionalMatrix = [];
        let topologyMatrix = [];

        // Handle functional matrix
        const getFunctionalRows = () => {
            if (Array.isArray(systemConfig.functionalMatrix.row)) {
                return systemConfig.functionalMatrix.row;
            } else if (systemConfig.functionalMatrix.row) {
                return [systemConfig.functionalMatrix.row];
            } else {
                throw new Error('Missing row elements in functionalMatrix');
            }
        };
        
        const getTopologyRows = () => {
            if (Array.isArray(systemConfig.topologyMatrix.row)) {
                return systemConfig.topologyMatrix.row;
            } else if (systemConfig.topologyMatrix.row) {
                return [systemConfig.topologyMatrix.row];
            } else {
                throw new Error('Missing row elements in topologyMatrix');
            }
        };

        const functionalRows = getFunctionalRows();
        const topologyRows = getTopologyRows();

        if (functionalRows.length !== numSubsystems) {
            throw new Error(`Expected ${numSubsystems} rows in functionalMatrix but found ${functionalRows.length}`);
        }

        if (topologyRows.length !== numSubsystems) {
            throw new Error(`Expected ${numSubsystems} rows in topologyMatrix but found ${topologyRows.length}`);
        }

        // Process each row
        for (let i = 0; i < functionalRows.length; i++) {
            const rowText = getNodeValue(functionalRows[i]);
            if (!rowText) {
                throw new Error(`Empty row in functionalMatrix at index ${i}`);
            }
            
            const rowValues = rowText
                .split(',')
                .map(val => {
                    const num = parseInt(val.trim());
                    if (isNaN(num)) {
                        throw new Error(`Invalid value in functionalMatrix: ${val}`);
                    }
                    return num;
                });
                
            if (rowValues.length !== numSubsystems) {
                throw new Error(`Row ${i} in functionalMatrix has ${rowValues.length} values but expected ${numSubsystems}`);
            }
            
            functionalMatrix.push(rowValues);
        }

        for (let i = 0; i < topologyRows.length; i++) {
            const rowText = getNodeValue(topologyRows[i]);
            if (!rowText) {
                throw new Error(`Empty row in topologyMatrix at index ${i}`);
            }
            
            const rowValues = rowText
                .split(',')
                .map(val => {
                    const num = parseInt(val.trim());
                    if (isNaN(num)) {
                        throw new Error(`Invalid value in topologyMatrix: ${val}`);
                    }
                    return num;
                });
                
            if (rowValues.length !== numSubsystems) {
                throw new Error(`Row ${i} in topologyMatrix has ${rowValues.length} values but expected ${numSubsystems}`);
            }
            
            topologyMatrix.push(rowValues);
        }

        // Parse vulnerabilities
        let vulnerabilityNodes = [];
        if (vulnerabilitiesNode && vulnerabilitiesNode.vulnerability) {
            if (Array.isArray(vulnerabilitiesNode.vulnerability)) {
                vulnerabilityNodes = vulnerabilitiesNode.vulnerability;
            } else {
                vulnerabilityNodes = [vulnerabilitiesNode.vulnerability];
            }
        }

        const vulnerabilities = [];
        for (const vul of vulnerabilityNodes) {
            if (!vul) continue;

            const subsystemIndex = parseInt(getNodeValue(vul.subsystemIndex));
            if (isNaN(subsystemIndex) || subsystemIndex < 0 || subsystemIndex >= numSubsystems) {
                throw new Error(`Invalid subsystemIndex in vulnerability: ${getNodeValue(vul.subsystemIndex)}`);
            }

            const impactScore = parseFloat(getNodeValue(vul.impactScore) || 5);
            if (isNaN(impactScore) || impactScore < 0 || impactScore > 10) {
                throw new Error(`Invalid impactScore in vulnerability: ${getNodeValue(vul.impactScore)}`);
            }

            const exploitScore = parseFloat(getNodeValue(vul.exploitScore) || 5);
            if (isNaN(exploitScore) || exploitScore < 0 || exploitScore > 10) {
                throw new Error(`Invalid exploitScore in vulnerability: ${getNodeValue(vul.exploitScore)}`);
            }

            const exploitExists = parseInt(getNodeValue(vul.exploitExists) || 0);
            if (exploitExists !== 0 && exploitExists !== 1) {
                throw new Error(`Invalid exploitExists in vulnerability: ${getNodeValue(vul.exploitExists)}`);
            }

            vulnerabilities.push({
                subsystemIndex,
                impactScore,
                exploitScore,
                exploitExists
            });
        }

        // Parse weight parameters
        const w1 = parseFloat(getNodeValue(systemConfig.w1) || 1);
        const w2 = parseFloat(getNodeValue(systemConfig.w2) || 1);
        const k4 = parseFloat(getNodeValue(systemConfig.k4) || 1);
        const k5 = parseFloat(getNodeValue(systemConfig.k5) || 2);

        if (isNaN(w1) || isNaN(w2) || isNaN(k4) || isNaN(k5)) {
            throw new Error('Invalid weight parameters (w1, w2, k4, k5)');
        }

        // Return structured and validated system config
        return {
            numSubsystems,
            functionalMatrix,
            topologyMatrix,
            w1,
            w2,
            k4,
            k5,
            vulnerabilities
        };
    }

    /**
     * Generate an example configuration object
     * @param {number} numSubsystems The number of subsystems
     * @returns {Object} Example configuration
     */
    static generateExampleConfig(numSubsystems = 3) {
        // Generate example functional and topology matrices
        const functionalMatrix = Array(numSubsystems)
            .fill(0)
            .map(() => Array(numSubsystems).fill(0));

        const topologyMatrix = Array(numSubsystems)
            .fill(0)
            .map(() => Array(numSubsystems).fill(0));

        // Add some dependencies and connections
        for (let i = 0; i < numSubsystems; i++) {
            for (let j = 0; j < numSubsystems; j++) {
                if (i !== j) {
                    functionalMatrix[i][j] = Math.random() > 0.3 ? 1 : 0;
                    topologyMatrix[i][j] = Math.random() > 0.6 ? 1 : 0;
                }
            }
        }

        // Generate example vulnerabilities
        const vulnerabilities = [];
        for (let i = 0; i < numSubsystems; i++) {
            vulnerabilities.push({
                subsystemIndex: i,
                impactScore: Math.floor(Math.random() * 9) + 1, // 1-10
                exploitScore: Math.floor(Math.random() * 9) + 1, // 1-10
                exploitExists: Math.random() > 0.5 ? 1 : 0 // 50% chance
            });
        }

        return {
            systemConfig: {
                numSubsystems,
                functionalMatrix,
                topologyMatrix,
                w1: 1.0,
                w2: 1.0,
                k4: 1.0,
                k5: 2.0
            },
            vulnerabilities
        };
    }

    /**
     * Generate example file content in the specified format
     * @param {string} format The file format: 'json', 'csv', or 'xml'
     * @param {number} numSubsystems The number of subsystems
     * @returns {string} The file content as a string
     */
    static generateExampleFile(format, numSubsystems = 3) {
        const config = this.generateExampleConfig(numSubsystems);

        if (format === 'json') {
            return JSON.stringify(config, null, 2);
        }
        else if (format === 'csv') {
            let csvContent = "type,numSubsystems,w1,w2,k4,k5\n";
            csvContent += `config,${numSubsystems},1.0,1.0,1.0,2.0\n\n`;

            csvContent += "type,";
            for (let i = 0; i < numSubsystems; i++) {
                csvContent += `col${i},`;
            }
            csvContent = csvContent.slice(0, -1) + "\n";

            // Functional matrix
            for (let i = 0; i < numSubsystems; i++) {
                csvContent += `functional,`;
                for (let j = 0; j < numSubsystems; j++) {
                    csvContent += `${config.systemConfig.functionalMatrix[i][j]},`;
                }
                csvContent = csvContent.slice(0, -1) + "\n";
            }

            // Topology matrix
            for (let i = 0; i < numSubsystems; i++) {
                csvContent += `topology,`;
                for (let j = 0; j < numSubsystems; j++) {
                    csvContent += `${config.systemConfig.topologyMatrix[i][j]},`;
                }
                csvContent = csvContent.slice(0, -1) + "\n";
            }

            csvContent += "\ntype,subsystemIndex,impactScore,exploitScore,exploitExists\n";
            for (const vul of config.vulnerabilities) {
                csvContent += `vulnerability,${vul.subsystemIndex},${vul.impactScore},${vul.exploitScore},${vul.exploitExists}\n`;
            }

            return csvContent;
        }
        else if (format === 'xml') {
            let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
            xmlContent += '<systemConfiguration>\n';
            xmlContent += '  <systemConfig>\n';
            xmlContent += `    <numSubsystems>${numSubsystems}</numSubsystems>\n`;
            xmlContent += `    <w1>1.0</w1>\n`;
            xmlContent += `    <w2>1.0</w2>\n`;
            xmlContent += `    <k4>1.0</k4>\n`;
            xmlContent += `    <k5>2.0</k5>\n`;

            xmlContent += '    <functionalMatrix>\n';
            for (let i = 0; i < numSubsystems; i++) {
                xmlContent += `      <row>${config.systemConfig.functionalMatrix[i].join(',')}</row>\n`;
            }
            xmlContent += '    </functionalMatrix>\n';

            xmlContent += '    <topologyMatrix>\n';
            for (let i = 0; i < numSubsystems; i++) {
                xmlContent += `      <row>${config.systemConfig.topologyMatrix[i].join(',')}</row>\n`;
            }
            xmlContent += '    </topologyMatrix>\n';
            xmlContent += '  </systemConfig>\n';

            xmlContent += '  <vulnerabilities>\n';
            for (const vul of config.vulnerabilities) {
                xmlContent += '    <vulnerability>\n';
                xmlContent += `      <subsystemIndex>${vul.subsystemIndex}</subsystemIndex>\n`;
                xmlContent += `      <impactScore>${vul.impactScore}</impactScore>\n`;
                xmlContent += `      <exploitScore>${vul.exploitScore}</exploitScore>\n`;
                xmlContent += `      <exploitExists>${vul.exploitExists}</exploitExists>\n`;
                xmlContent += '    </vulnerability>\n';
            }
            xmlContent += '  </vulnerabilities>\n';
            xmlContent += '</systemConfiguration>';

            return xmlContent;
        }

        throw new Error(`Unsupported format: ${format}`);
    }
}