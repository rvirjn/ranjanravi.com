#!/bin/bash
sudo curl https://get.docker.com/ -sSL | sh
sudo usermod -aG docker ubuntu
sudo sysctl net.ipv4.conf.all.forwarding=1
sudo iptables -P FORWARD ACCEPT

sudo docker network create mongodb-net
sudo docker create --name mongodb --network mongodb-net --publish 27017:27017 raviranjanamu/mongodb
sudo docker start mongodb

sudo docker network create shopping-net
sudo docker create --name shopping --network shopping-net --publish 9999:80 raviranjanamu/nginx
sudo docker start shopping

sudo docker network create booking-net
sudo docker create --name booking --network booking-net --publish 8888:8080 raviranjanamu/tomcat
sudo docker start booking

sudo docker network create profile-net
sudo docker create --name profile --network profile-net --publish 7777:80 raviranjanamu/nginx
sudo docker start profile

sudo docker network create checkspell-net
sudo docker create --name checkspell --network checkspell-net --publish 2222:80 raviranjanamu/httpd
sudo docker start checkspell

sudo docker network create hierarchy-net
sudo docker create --name hierarchy --network hierarchy-net --publish 5555:80 raviranjanamu/tomcat
sudo docker start hierarchy

sudo docker network create onlinetest-net
sudo docker create --name onlinetest --network onlinetest-net --publish 4444:80 raviranjanamu/httpd
sudo docker start onlinetest

sudo docker network create social-net
sudo docker create --name social --network social-net --publish 3333:80 raviranjanamu/nginx
sudo docker start social

sudo docker network create jupyter-net
sudo docker create --name jupyter --network jupyter-net --publish 8082:8888 jupyter/datascience-notebook
sudo docker start jupyter
