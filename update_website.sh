#!/bin/bash
echo 'Performing post action for updating ranjanravi.com'
#mv .git ../
scp -r -i gcloud_ranjanravi_instance_1 profile raviranjan_amu@ranjanbooking.com:/home/raviranjan_amu/ranjanravi.com

echo 'Project copied to vm ranjanbooking.com'
#ssh -i gcloud_ranjanravi_instance_1 raviranjan_amu@ranjanbooking.com 'sudo docker cp /home/raviranjan_amu/ nginx:/usr/share/nginx/'
#ssh -i gcloud_ranjanravi_instance_1 raviranjan_amu@ranjanbooking.com 'sudo docker cp /home/raviranjan_amu/ tomcat:/usr/local/tomcat/webapps/ROOT/'
ssh -i gcloud_ranjanravi_instance_1 raviranjan_amu@ranjanbooking.com 'sudo docker cp /home/raviranjan_amu/ranjanravi.com/profile/. httpd:/usr/local/apache2/htdocs/'
echo 'Project copied to docker'
#mv ../.git .
