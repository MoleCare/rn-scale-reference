#!/usr/bin/env bash
# Install the packed package the way an app would, with one package manager,
# and check that it loads.
#
#   scripts/check-consumer.sh <npm|yarn1|yarn4-pnp|yarn4-node-modules|pnpm|bun> [path/to/package.tgz]
#
# Every package manager gets: require() from CommonJS and import from an ES
# module. npm also gets the checks that do not depend on the package manager:
# a Jest project with Jest's default settings (node_modules not transformed),
# and a strict TypeScript project in both node16 and bundler resolution.
set -euo pipefail

PM="${1:?package manager}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAME="$(node -p "require('$ROOT/package.json').name")"

TARBALL="${2:-}"
if [ -z "$TARBALL" ]; then
  TARBALL="$ROOT/$(cd "$ROOT" && npm pack --silent | tail -n 1)"
fi
TARBALL="$(cd "$(dirname "$TARBALL")" && pwd)/$(basename "$TARBALL")"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cd "$WORK"

YARN4=yarn@4.9.4
PNPM=pnpm@10.18.2
BUN=bun@1.2.23

write_package_json() {
  node -e '
    const [name, tarball, pm] = process.argv.slice(1);
    const pkg = {name: "consumer", version: "1.0.0", private: true, type: "commonjs", dependencies: {[name]: "file:" + tarball}};
    if (pm) pkg.packageManager = pm;
    require("fs").writeFileSync("package.json", JSON.stringify(pkg, null, 2));
  ' "$NAME" "$TARBALL" "${1:-}"
}

RUN=(node)
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
case "$PM" in
  npm)
    write_package_json
    npm install --no-audit --no-fund --silent
    ;;
  yarn1)
    write_package_json
    npx --yes yarn@1.22.22 install --non-interactive --silent
    ;;
  yarn4-pnp | yarn4-node-modules)
    write_package_json "$YARN4"
    printf 'nodeLinker: %s\nenableGlobalCache: false\n' "${PM#yarn4-}" > .yarnrc.yml
    YARN_ENABLE_IMMUTABLE_INSTALLS=false corepack yarn install
    [ "$PM" = yarn4-pnp ] && RUN=(corepack yarn node)
    ;;
  pnpm)
    write_package_json
    npx --yes "$PNPM" install
    ;;
  bun)
    write_package_json
    npx --yes "$BUN" install
    ;;
  *)
    echo "unknown package manager: $PM" >&2
    exit 2
    ;;
esac

echo "--- $PM: require() from CommonJS"
cat > use.cjs <<EOF
const lib = require('$NAME');
const scale = lib.scaleFromEllipse({majorAxisPx: 200, minorAxisPx: 200}, 10);
if (!scale.usable || Math.abs(scale.mmPerPixel - 0.05) > 1e-9) throw new Error('wrong result ' + JSON.stringify(scale));
console.log('ok');
EOF
"${RUN[@]}" use.cjs

echo "--- $PM: import from an ES module"
cat > use.mjs <<EOF
import {scaleFromEllipse, REFERENCE_OBJECTS} from '$NAME';
const scale = scaleFromEllipse({majorAxisPx: 200, minorAxisPx: 200}, REFERENCE_OBJECTS.STICKER_10MM.diameterMm);
if (!scale.usable) throw new Error('wrong result');
console.log('ok');
EOF
"${RUN[@]}" use.mjs

if [ "$PM" != npm ]; then
  exit 0
fi

npm install --no-audit --no-fund --silent jest@30 typescript@~6.0.3 @types/node@22

echo "--- Jest with its default settings"
mkdir -p __tests__
cat > __tests__/load.test.js <<EOF
test('loads without transforming node_modules', () => {
  const {scaleFromEllipse} = require('$NAME');
  expect(scaleFromEllipse({majorAxisPx: 200, minorAxisPx: 200}, 10).usable).toBe(true);
});
EOF
npx jest --ci

for resolution in node16 bundler; do
  echo "--- TypeScript, strict, moduleResolution $resolution"
  module=$([ "$resolution" = node16 ] && echo node16 || echo esnext)
  cat > tsconfig.json <<EOF
{"compilerOptions": {"strict": true, "noEmit": true, "module": "$module", "moduleResolution": "$resolution", "types": []}, "include": ["*.ts", "*.mts", "*.cts"]}
EOF
  cat > use-types.mts <<EOF
import {scaleFromEllipse, toMillimetres, type Scale} from '$NAME';
const scale: Scale = scaleFromEllipse({majorAxisPx: 200, minorAxisPx: 200}, 10);
const mm: number | null = toMillimetres(120, scale);
if (scale.usable) { const n: number = scale.mmPerPixel; void n; }
// @ts-expect-error mmPerPixel may be null until usable is checked
const wrong: number = scale.mmPerPixel;
export {mm, wrong};
EOF
  if [ "$resolution" = node16 ]; then
    cat > use-types.cts <<EOF
import lib = require('$NAME');
const scale: lib.Scale = lib.scaleFromEllipse({majorAxisPx: 1, minorAxisPx: 1}, 10);
export = scale;
EOF
  else
    rm -f use-types.cts
  fi
  npx tsc -p tsconfig.json
  echo ok
done
