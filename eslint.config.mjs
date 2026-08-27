import js from "@eslint/js";
import globals from "globals";
import markdown from "@eslint/markdown";
import json from "@eslint/json";
import {
    defineConfig
}
from "eslint/config";

export default defineConfig( [ {
        files: [ "**/*.{js,mjs,cjs}" ],
        plugins: {
            js
        },
        extends: [ "js/recommended" ],
        ignores: [ "node_modules/**" ],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.browser
            }
        },
        rules: {
            "no-console": "off",
            "no-unused-vars": "warn",
            "no-debugger": "warn"
        }
    },
    {
        files: [ "**/*.js" ],
        languageOptions: {
            sourceType: "commonjs"
        }
    },

    {
        files: [ "**/*.md" ],
        plugins: {
            markdown
        },
        language: "markdown/gfm",
        extends: [ "markdown/recommended" ]
    },
    {
        files: [ "**/*.json" ],
        plugins: {
            json
        },
        language: "json/json",
        extends: [ "json/recommended" ]
    },
    {
        files: [ "**/*.jsonc" ],
        plugins: {
            json
        },
        language: "json/jsonc",
        extends: [ "json/recommended" ]
    },
    {
        files: [ "**/*.json5" ],
        plugins: {
            json
        },
        language: "json/json5",
        extends: [ "json/recommended" ]
    }
] );
