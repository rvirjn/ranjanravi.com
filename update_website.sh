#!/bin/bash
echo 'post run after upload_to_production.py'
echo 'Performing post action for updating ranjanravi.com'
ssh -i aws-new-key-sg-new.pem ubuntu@13.234.239.179 'sudo docker cp /home/ubuntu/ranjanravi.com/shopping/. nginx:/usr/share/nginx/html/'
ssh -i aws-new-key-sg-new.pem ubuntu@13.234.239.179 'sudo docker cp /home/ubuntu/ranjanravi.com/booking/. tomcat:/usr/local/tomcat/webapps/ROOT/'
ssh -i aws-new-key-sg-new.pem ubuntu@13.234.239.179 'sudo docker cp /home/ubuntu/ranjanravi.com/profile/. httpd:/usr/local/apache2/htdocs/'
echo 'Project copied to docker'
