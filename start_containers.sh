#!/bin/bash
#13.127.99.82
sudo curl https://get.docker.com/ -sSL | sh
sudo usermod -aG docker ubuntu
sudo sysctl net.ipv4.conf.all.forwarding=1
sudo iptables -P FORWARD ACCEPT

sudo docker network create my-net

sudo docker create --name mongodb --network my-net --publish 27017:27017 raviranjanamu/mongodb
sudo docker start mongodb

sudo docker create --name shopping --network my-net --publish 9999:80 raviranjanamu/nginx
sudo docker start shopping

sudo docker create --name booking --network my-net --publish 6660:8080 raviranjanamu/tomcat
sudo docker start booking

# sudo docker create --name profile --network my-net --publish 7777:80 raviranjanamu/nginx
# sudo docker start profile

sudo docker create --name farmination --network my-net --publish 2222:80 raviranjanamu/httpd
sudo docker start farmination

sudo docker create --name school --network my-net --publish 5555:8080 raviranjanamu/tomcat
sudo docker start school

#sudo docker create --name onlinetest --network my-net --publish 4444:80 raviranjanamu/httpd
#sudo docker start onlinetest

#sudo docker create --name social --network my-net --publish 3333:80 raviranjanamu/nginx
#sudo docker start social

sudo docker create --name jupyter --network my-net --publish 8880:8888 raviranjanamu/jupyter:1.0
sudo docker start jupyter

sudo docker ps -a