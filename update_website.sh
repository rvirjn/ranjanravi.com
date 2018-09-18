#!/bin/bash
echo 'Performing post action for updating raviranjan.org.in'
chmod 600 key.pem
scp -r -i key.pem . ubuntu@13.233.12.206:/home/ubuntu/html/
echo 'Project copied to aws vm 13.233.12.206'
ssh -i key.pem ubuntu@13.233.12.206 'docker cp /home/ubuntu/html/ raviranjan.org.80.80:/usr/share/nginx/'
echo 'Project copied to aws docker location /usr/share/nginx/html/'
