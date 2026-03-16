#!/usr/bin/env bash
#
# deploy-testflight.sh — Interactive TestFlight deployment for Shadow mobile app
# Usage: ./scripts/deploy-testflight.sh
#
set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { printf "${BLUE}ℹ ${NC}%s\n" "$*"; }
success() { printf "${GREEN}✔ ${NC}%s\n" "$*"; }
warn()    { printf "${YELLOW}⚠ ${NC}%s\n" "$*"; }
error()   { printf "${RED}✖ ${NC}%s\n" "$*"; }
header()  { printf "\n${BOLD}${CYAN}━━━ %s ━━━${NC}\n\n" "$*"; }

ask_continue() {
  printf "${YELLOW}▶ %s${NC} [Y/n] " "$1"
  read -r ans
  case "$ans" in
    [nN]*) echo "Skipped."; return 1 ;;
    *)     return 0 ;;
  esac
}

MOBILE_DIR="$(cd "$(dirname "$0")/../apps/mobile" && pwd)"
PROFILE="production"
PLATFORM="ios"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--profile)
      PROFILE="${2:-}"
      shift 2
      ;;
    --platform)
      PLATFORM="${2:-}"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [--profile <name>] [--platform ios]"
      exit 0
      ;;
    *)
      error "Unknown argument: $1"
      echo "Usage: $0 [--profile <name>] [--platform ios]"
      exit 1
      ;;
  esac
done

if [[ "$PLATFORM" != "ios" ]]; then
  error "Only iOS TestFlight deployment is supported by this script."
  exit 1
fi

json_get() {
  local json="$1"
  local js_expr="$2"
  printf "%s" "$json" | node -e "
    let data='';
    process.stdin.on('data', c => data += c);
    process.stdin.on('end', () => {
      const obj = JSON.parse(data || '{}');
      const val = ${js_expr};
      process.stdout.write((val ?? '').toString());
    });
  "
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
header "Step 1 / 7 — Prerequisites Check"
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Check Node.js
if command -v node &>/dev/null; then
  success "Node.js $(node -v)"
else
  error "Node.js not found. Install from https://nodejs.org"
  exit 1
fi

# Check EAS CLI
if command -v eas &>/dev/null; then
  success "EAS CLI $(eas --version)"
else
  warn "EAS CLI not installed."
  if ask_continue "Install eas-cli globally?"; then
    npm install -g eas-cli
    success "EAS CLI installed: $(eas --version)"
  else
    error "EAS CLI is required. Run: npm install -g eas-cli"
    exit 1
  fi
fi

# Check Apple Developer Program membership
info "You need an active Apple Developer Program membership (\$99/year)."
info "Enroll at: https://developer.apple.com/programs/"
ask_continue "Do you have an active Apple Developer account?" || {
  error "An Apple Developer account is required for TestFlight."
  exit 1
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
header "Step 2 / 7 — EAS Login"
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CURRENT_USER=$(eas whoami 2>/dev/null || true)
if [[ -n "$CURRENT_USER" ]]; then
  success "Logged in as: $CURRENT_USER"
else
  info "You need an Expo account. Sign up free at https://expo.dev/signup"
  eas login
  success "Logged in as: $(eas whoami)"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
header "Step 3 / 7 — EAS Project Setup"
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

cd "$MOBILE_DIR"
info "Working directory: $MOBILE_DIR"

EXPO_CONFIG_JSON="$(npx expo config --json 2>/dev/null || true)"
if [[ -z "$EXPO_CONFIG_JSON" ]]; then
  error "Unable to read Expo config. Run this script after dependencies are installed."
  exit 1
fi

APP_NAME="$(json_get "$EXPO_CONFIG_JSON" "obj.name")"
BUNDLE_ID="$(json_get "$EXPO_CONFIG_JSON" "obj.ios?.bundleIdentifier")"
APP_VERSION="$(json_get "$EXPO_CONFIG_JSON" "obj.version")"
CURRENT_PROJECT_ID="$(json_get "$EXPO_CONFIG_JSON" "obj.extra?.eas?.projectId")"

# Check if project ID is configured
if [[ "$CURRENT_PROJECT_ID" == "your-project-id" || -z "$CURRENT_PROJECT_ID" ]]; then
  warn "EAS project ID not configured in app.config.ts"
  info "This will link your project to an EAS project and set the project ID."
  echo ""
  if ask_continue "Run 'eas init' to create/link the project?"; then
    eas init
    success "EAS project linked."
  else
    warn "You need to manually set extra.eas.projectId in app.config.ts"
  fi
else
  success "EAS project ID: $CURRENT_PROJECT_ID"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
header "Step 4 / 7 — Apple Credentials"
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

info "EAS Build will manage iOS certificates and provisioning profiles for you."
info "During the build, you'll be asked to:"
echo ""
echo "  1. Log in with your Apple ID"
echo "  2. Let EAS generate (or select) a Distribution Certificate"
echo "  3. Let EAS generate (or select) a Provisioning Profile"
echo ""
info "Tip: Let EAS manage credentials automatically for the smoothest experience."
echo ""

printf "${YELLOW}▶ Choose credential strategy:${NC}\n"
echo "  1) Let EAS manage automatically (recommended)"
echo "  2) Use App Store Connect API key (CI-friendly, no 2FA prompts)"
echo ""
printf "  Choice [1]: "
read -r cred_choice

if [[ "$cred_choice" == "2" ]]; then
  echo ""
  info "To create an App Store Connect API key:"
  echo "  1. Go to https://appstoreconnect.apple.com/access/integrations/api"
  echo "  2. Click '+' to create a new key (role: App Manager or Admin)"
  echo "  3. Download the .p8 file — you can only download it once!"
  echo ""
  printf "  Path to .p8 key file: "
  read -r key_path
  printf "  Key ID (e.g., XXXXXXXXXX): "
  read -r key_id
  printf "  Issuer ID (e.g., xxxxxxxx-xxxx-...): "
  read -r issuer_id

  if [[ -f "$key_path" && -n "$key_id" && -n "$issuer_id" ]]; then
    export EXPO_APPLE_KEY_PATH="$key_path"
    export EXPO_APPLE_KEY_ID="$key_id"
    export EXPO_APPLE_ISSUER_ID="$issuer_id"
    success "API key configured for this session."
  else
    warn "Invalid input. Falling back to interactive Apple ID login during build."
  fi
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
header "Step 5 / 7 — Configuration Review"
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "  App name:          ${APP_NAME:-N/A}"
echo "  Bundle ID:         ${BUNDLE_ID:-N/A}"
echo "  Version:           ${APP_VERSION:-N/A}"
echo "  Build profile:     ${PROFILE}"
echo "  Platform:          ${PLATFORM}"
echo "  Submit to:         TestFlight"
echo ""

# Check eas.json production profile
info "eas.json build profiles:"
node -e "const c = JSON.parse(require('fs').readFileSync('eas.json','utf8')); Object.keys(c.build).forEach(p => console.log('  -', p, JSON.stringify(c.build[p])));"
echo ""

if ! ask_continue "Proceed with ${PLATFORM} ${PROFILE} build?"; then
  info "Aborted. You can re-run this script when ready."
  exit 0
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
header "Step 6 / 7 — Build for iOS"
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

info "Starting EAS Build (${PROFILE} profile, ${PLATFORM})..."
info "This runs in the cloud — typically takes 10-30 minutes."
echo ""

PRE_BUILDS_JSON="$(eas build:list --platform "$PLATFORM" --build-profile "$PROFILE" --limit 20 --json 2>/dev/null || echo '[]')"
PRE_BUILD_IDS="$(json_get "$PRE_BUILDS_JSON" "Array.isArray(obj) ? obj.map(x => x.id).join(',') : ''")"

BUILD_FLAGS=(--platform "$PLATFORM" --profile "$PROFILE")

if [[ -n "${EXPO_APPLE_KEY_PATH:-}" ]]; then
  info "Using App Store Connect API key for credentials."
fi

if [[ "${CI:-}" == "true" ]]; then
  BUILD_FLAGS+=(--non-interactive)
fi

eas build "${BUILD_FLAGS[@]}"

success "iOS build completed!"
echo ""

LATEST_FINISHED_JSON="$(eas build:list --platform "$PLATFORM" --build-profile "$PROFILE" --status finished --limit 20 --json 2>/dev/null || echo '[]')"
LATEST_BUILD_ID="$(json_get "$LATEST_FINISHED_JSON" "Array.isArray(obj) && obj.length > 0 ? obj[0].id : ''")"

if [[ -z "$LATEST_BUILD_ID" ]]; then
  warn "Could not detect latest finished build ID automatically."
  warn "Submission can still be done manually from EAS dashboard or with 'eas submit --latest'."
fi

if [[ -n "$LATEST_BUILD_ID" && ",$PRE_BUILD_IDS," == *",$LATEST_BUILD_ID,"* ]]; then
  warn "Detected latest finished build ID already existed before this run: $LATEST_BUILD_ID"
  warn "If this looks wrong, wait 1-2 minutes and submit manually by selecting the intended build in EAS."
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
header "Step 7 / 7 — Submit to TestFlight"
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

info "Submitting iOS build to App Store Connect (TestFlight)..."
echo ""

if ask_continue "Submit to TestFlight now?"; then
  SUBMIT_FLAGS=(--platform "$PLATFORM" --profile "$PROFILE")
  if [[ -n "$LATEST_BUILD_ID" ]]; then
    SUBMIT_FLAGS+=(--id "$LATEST_BUILD_ID")
    info "Submitting explicit build ID: $LATEST_BUILD_ID"
  else
    SUBMIT_FLAGS+=(--latest)
    warn "Falling back to --latest because build ID is unavailable."
  fi

  if [[ "${CI:-}" == "true" ]]; then
    SUBMIT_FLAGS+=(--non-interactive)
  fi

  eas submit "${SUBMIT_FLAGS[@]}"
  success "Build submitted to App Store Connect!"
  echo ""
  info "Next steps:"
  echo "  1. Open App Store Connect: https://appstoreconnect.apple.com"
  echo "  2. Go to your app → TestFlight tab"
  echo "  3. Wait for Apple's automated review (usually 10-30 minutes)"
  echo "  4. Once approved, add internal/external testers"
  echo "  5. Testers will receive a TestFlight invitation email"
else
  echo ""
  info "You can submit later with:"
  if [[ -n "$LATEST_BUILD_ID" ]]; then
    echo "  cd apps/mobile && eas submit --platform ios --profile $PROFILE --id $LATEST_BUILD_ID"
  else
    echo "  cd apps/mobile && eas submit --platform ios --profile $PROFILE --latest"
  fi
fi

echo ""
header "Done! 🎉"
info "Build + Submit complete. Check TestFlight in App Store Connect."
echo ""
