#!/bin/bash

USAGE="Description:
  Writes systemd service file for webhooks service.

Usage:
  '${BASH_SOURCE[0]}'  App-install-folder  Config-file  Output-folder
"

inst_folder=$1
conf_file=$2
services_folder=$3

if [ -z "$inst_folder" ] || [ -z "$conf_file" ] || [ -z "$services_folder" ]
then
	echo "$USAGE"
	exit 1
fi

echo "Writing service file to $services_folder"

invoke="'$inst_folder/node/bin/node' '$inst_folder/webhook-app/build/run.js'"
pre_start="$invoke -t '$conf_file'"
start="$invoke '$conf_file'"

# 1 - prep file content
file_content="
[Unit]
Description=Webhooks server
After=network.target

[Service]
ExecStartPre=$pre_start
ExecStart=$start
ExecReload=$pre_start
ExecReload=/bin/kill -HUP \$MAINPID
KillMode=process
TimeoutStopSec=10

[Install]
WantedBy=multi-user.target
"

echo "$file_content" > "$services_folder/webhooks.service"