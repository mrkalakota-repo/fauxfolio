#!/bin/bash
# Installs a macOS launchd agent that runs nightly_close_snapshot() at midnight
# local time against the local development database.
#
# Usage:
#   chmod +x scripts/setup-local-cron.sh
#   ./scripts/setup-local-cron.sh          # install
#   ./scripts/setup-local-cron.sh remove   # uninstall

set -e

LABEL="com.fauxfolio.midnight-snapshot"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
DB_URL="${DATABASE_URL:-postgresql://mrkalakota@localhost/stocksim}"
PSQL="$(which psql)"

if [ "$1" = "remove" ]; then
  launchctl unload "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "Removed launchd agent."
  exit 0
fi

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${PSQL}</string>
    <string>${DB_URL}</string>
    <string>-c</string>
    <string>SELECT nightly_close_snapshot();</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>0</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>/tmp/fauxfolio-midnight-snapshot.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/fauxfolio-midnight-snapshot.log</string>
</dict>
</plist>
EOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

echo "Installed launchd agent — will run nightly_close_snapshot() at midnight."
echo "Logs: /tmp/fauxfolio-midnight-snapshot.log"
echo "To remove: ./scripts/setup-local-cron.sh remove"
