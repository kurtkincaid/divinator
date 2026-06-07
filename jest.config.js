module.exports = {
    testEnvironment: 'node',
    collectCoverageFrom: [
        'index.js',
        '!node_modules/**'
    ],
    coverageReporters: [ 'text', 'lcov', 'html' ],
    testMatch: [ '**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js' ],
    verbose: true
};
