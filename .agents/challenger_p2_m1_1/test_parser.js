const fs = require('fs');

try {
  const acorn = require('acorn');
  console.log('acorn available');
} catch (e) {
  console.log('acorn not available');
}

try {
  const babel = require('@babel/parser');
  console.log('babel available');
} catch (e) {
  console.log('babel not available');
}
