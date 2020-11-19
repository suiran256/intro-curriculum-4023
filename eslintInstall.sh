#!/bin/bash
cp ../common/eslintstylelint/.prettierrc.js .
cp ../common/eslintstylelint/eslint/root/.eslintrc.js .
cp ../common/eslintstylelint/eslint/webpack/.eslintrc.js app
npm install -D eslint prettier eslint-config-prettier eslint-plugin-prettier
#echo ".eslintrc.js" >> .gitignore
#echo ".prettierrc.js" >> .gitignore

