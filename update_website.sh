#!/bin/bash
echo 'Performing post action for updating ranjanravi.com'
#mv .git ../
scp -r -i gcloud_ranjanravi_instance_1 ranjanravi.com raviranjan_amu@ranjanbooking.com:/home/raviranjan_amu/

echo 'Project copied to vm ranjanbooking.com'
#ssh -i gcloud_ranjanravi_instance_1 raviranjan_amu@ranjanbooking.com 'sudo docker cp /home/ubuntu/html/ nginx:/usr/share/nginx/'
#ssh -i gcloud_ranjanravi_instance_1 raviranjan_amu@ranjanbooking.com 'sudo docker cp /home/ubuntu/html/ tomcat:/usr/local/tomcat/webapps/ROOT/'
#ssh -i gcloud_ranjanravi_instance_1 raviranjan_amu@ranjanbooking.com 'sudo docker cp /home/ubuntu/html/ ranjanravi.org:/usr/share/nginx/'
#ssh -i gcloud_ranjanravi_instance_1 raviranjan_amu@ranjanbooking.com 'sudo docker cp /home/ubuntu/html/ /usr/local/apache2/htdocs'
#echo 'Project copied to docker'
#mv ../.git .
