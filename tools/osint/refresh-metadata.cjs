// Refresh the offline metadata catalog after adding or changing activity photos.
// Run from any directory: node tools/osint/refresh-metadata.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../../learn/osint');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const start = app.indexOf('function parseExif(');
const end = app.indexOf('\nfunction ', start + 1);
if (start < 0 || end < 0) throw new Error('Could not locate the activity EXIF reader.');
const context = { DataView, Uint8Array, TextDecoder };
vm.createContext(context);
vm.runInContext(app.slice(start, end), context);
const metadata = {};
for (const name of fs.readdirSync(path.join(root, 'assets')).filter(n => /\.jpg$/i.test(n)).sort()) {
  const bytes = fs.readFileSync(path.join(root, 'assets', name));
  metadata[name] = {
    bytes: bytes.length,
    exif: context.parseExif(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
  };
}
const header = '// DSC_1042 GPS is staged: teacher-requested public school Easter egg at 100 Midland Ave.\n' +
  '// Coordinates 38.041160, -84.488690 identify the school, not the fictional photo subjects.\n' +
  '// Metadata read from the exact bundled JPEG files; works offline as well as online.\n';
fs.writeFileSync(path.join(root, 'metadata-data.js'), header + 'const PHOTO_METADATA = ' + JSON.stringify(metadata, null, 2) + ';\n');
console.log(`Indexed ${Object.keys(metadata).length} activity photos.`);
