#!/bin/bash
echo 'Upload localhost'
sudo rm -rf /var/www/html/*
sudo cp -r . /var/www/html/
sudo rm -rf /var/www/html/.git
if [ $# -eq 1 ]
  then
echo 'Run upload_to_production.py first'
echo 'Performing post action for updating ranjanravi.com'
ssh -i aws-new-key-sg-new.pem ubuntu@13.234.239.179 'sudo docker cp /home/ubuntu/ranjanravi.com/shopping/. shopping:/usr/share/nginx/html/'
ssh -i aws-new-key-sg-new.pem ubuntu@13.234.239.179 'sudo docker cp /home/ubuntu/ranjanravi.com/booking/. tomcat:/usr/local/tomcat/webapps/ROOT/'
ssh -i aws-new-key-sg-new.pem ubuntu@13.234.239.179 'sudo docker cp /home/ubuntu/ranjanravi.com/profile/. profile:/usr/share/nginx/html/'

ssh -i aws-new-key-sg-new.pem ubuntu@13.234.239.179 'sudo docker cp /home/ubuntu/ranjanravi.com/checkspell/. checkspell:/usr/share/nginx/html/'
ssh -i aws-new-key-sg-new.pem ubuntu@13.234.239.179 'sudo docker cp /home/ubuntu/ranjanravi.com/hierarchy/. hierarchy:/usr/local/tomcat/webapps/ROOT/'
ssh -i aws-new-key-sg-new.pem ubuntu@13.234.239.179 'sudo docker cp /home/ubuntu/ranjanravi.com/onlinetest/. onlinetest:/usr/local/apache2/htdocs/'
ssh -i aws-new-key-sg-new.pem ubuntu@13.234.239.179 'sudo docker cp /home/ubuntu/ranjanravi.com/social/. social:/usr/share/nginx/html/'

echo 'Project copied to docker'

fi