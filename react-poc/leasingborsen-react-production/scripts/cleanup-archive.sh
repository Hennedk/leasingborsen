#!/usr/bin/env bash
set -euo pipefail

# Archive and cleanup helper
# - Moves screenshots, HTML reports, sample images, ad-hoc test scripts into archive folders
# - Optionally deletes rebuildable caches (node_modules, dist, .serena/cache, .tanstack/tmp, test-results)
# Usage: bash scripts/cleanup-archive.sh [--dry-run]

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
fi

info() { echo "• $*"; }
do_cmd() { if (( DRY_RUN )); then echo "[dry-run] $*"; else eval "$@"; fi; }
ensure_dir() { [[ -d "$1" ]] || do_cmd "mkdir -p \"$1\""; }
move_file() { local src="$1" dest="$2"; if [[ -e "$src" ]]; then ensure_dir "$(dirname "$dest")"; do_cmd "mv -v \"$src\" \"$dest\""; fi; }
move_dir_contents() {
  local dir="$1" dest="$2"
  if [[ -d "$dir" ]]; then
    ensure_dir "$dest"
    shopt -s dotglob nullglob
    local items=("$dir"/*)
    shopt -u dotglob nullglob
    if (( ${#items[@]} )); then
      for i in "${items[@]}"; do
        move_file "$i" "$dest/$(basename "$i")"
      done
    fi
    if [[ -d "$dir" ]]; then do_cmd "rmdir \"$dir\"" || true; fi
  fi
}
prompt_rm() {
  local target="$1"
  if [[ -e "$target" ]]; then
    if (( DRY_RUN )); then
      echo "[dry-run] rm -rf \"$target\""
      return 0
    fi
    if [[ ! -t 0 ]]; then
      echo "Skip '$target' (non-interactive)"
      return 0
    fi
    read -r -p "Delete '$target'? [y/N] " ans
    case "$ans" in
      [yY]|[yY][eE][sS]) rm -rf "$target" ;;
      *) echo "Skip '$target'" ;;
    esac
  fi
}

info "Preparing archive directories"
ensure_dir "archive/test-artifacts"
ensure_dir "archive/screenshots"
ensure_dir "archive/projects"
ensure_dir "scripts/archive"

info "Archiving screenshots"
move_dir_contents "screens" "archive/screenshots"

info "Archiving HTML result files"
for f in \
  "auto-crop-fix-results.html" \
  "auto-crop-test-results.html" \
  "staging-auto-crop-results.html" \
  "tight-crop-comparison.html"
do
  [[ -e "$f" ]] && move_file "$f" "archive/test-artifacts/$(basename "$f")"
done

info "Archiving image fixtures and large samples"
for f in \
  "05_Opel_521743-1-scaled.jpg" \
  "opel_detail_size.webp" \
  "opel_processed_with_bg_removal.webp" \
  "test-car.jpg" \
  "api-shadow-result.webp" \
  "test_car_base64.txt"
do
  [[ -e "$f" ]] && move_file "$f" "archive/test-artifacts/$(basename "$f")"
done

info "Archiving root-level ad-hoc test scripts"
shopt -s nullglob
for f in test-*.js test-*.ts test-*.py test-python-service.js test-auto-crop-fix.cjs; do
  [[ -e "$f" ]] && move_file "$f" "scripts/archive/$(basename "$f")"
done
shopt -u nullglob

info "Archiving POC projects"
if [[ -d "railway-pdfplumber-poc" ]]; then
  do_cmd "mv -v \"railway-pdfplumber-poc\" \"archive/projects/\""
fi

echo ""
echo "Optional deletions (rebuildable caches):"
prompt_rm "node_modules"
prompt_rm "dist"
prompt_rm ".serena/cache"
prompt_rm ".tanstack/tmp"
prompt_rm "test-results"

echo ""
echo "Done. Use --dry-run to preview. You can rerun safely."
