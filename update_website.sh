#!/bin/bash
echo 'Performing post action for updating raviranjan.org.in'
chmod 600 key.pem
mv .git ../
scp -r -i key.pem index.html ubuntu@13.127.120.189:/home/ubuntu/html/
echo 'Project copied to aws vm 13.127.120.189'
ssh -i key.pem ubuntu@13.127.120.189 'sudo docker cp /home/ubuntu/html/ ranjanravi.com:/usr/share/nginx/'
ssh -i key.pem ubuntu@13.127.120.189 'sudo docker cp /home/ubuntu/html/ ranjanravi.org:/usr/share/nginx/'
echo 'Project copied to aws docker location /usr/share/nginx/html/'
mv ../.git .
