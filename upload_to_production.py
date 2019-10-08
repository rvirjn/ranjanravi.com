# Description: Upload local code changes to remote machine using paramiko
# Disabled: True
# Tracks your locally modified files and upload it to remote Goat-CentOS
# Call upload_change_to('/root/your_goat_location/lanier-goat')
# Warning: Take backup of any important changes made on cent-os VM
# All locally modified files & folders will be overwritten to cent os
# to get list of files to be uploaded 'git status -s'

import logging
import os
import paramiko
from subprocess import Popen, PIPE
import warnings
warnings.filterwarnings(action='ignore', module='.*paramiko.*')
__author__ = 'raviranjan'

# Changes will be uploaded to below location
GOAT_IP = "13.234.239.179"
GOAT_USERNAME = "ubuntu"
GOAT_PWD = ""
port = 22
PRIVATEKEY = 'aws-new-key-sg-new.pem'
REMOTE_GOAT_LOCATION = "/home/ubuntu/ranjanravi.com/"
IGNORE_FILES = ["upload_to_production"]


class Server(object):
    """
    Wraps paramiko for SFTP upload-download.
    """
    def __init__(self, username, password, host, port=22):
        logging.debug("Creating %s connection object (%s/%s)" %
                      (host, username, password))
        self.host = host
        self.transport = paramiko.Transport((host, port))
        rsa_key = paramiko.RSAKey.from_private_key_file(PRIVATEKEY)
        self.transport.connect(username=username, pkey=rsa_key)
        # self.transport.connect(username=username, password=password)
        self.sftp = paramiko.SFTPClient.from_transport(self.transport)

    def upload(self, local, remote):
        logging.debug("uploading file %s to %s:%s" % (
            local, self.host, remote))
        self.sftp.put(local, remote)

    def download(self, remote, local):
        logging.debug("downloading file %s from %s:%s" % (
            local, self.host, remote))
        self.sftp.get(remote, local)

    def isdir(self, dir_path):
        logging.debug("Checking if %s:%s directory exists" %
                      (self.host, dir_path))
        default_cwd = self.sftp.getcwd()
        try:
            self.sftp.chdir(dir_path)
            dir_present = True
        except IOError:
            dir_present = False
        finally:
            self.sftp.chdir(default_cwd)
        logging.info("Dir %s exists: %s" % (dir_path, dir_present))
        return dir_present

    def close(self):
        """
        Close the connection if it's active
        """
        if self.transport.is_active():
            logging.debug("Closing the active connection %s" % self.host)
            self.sftp.close()
            self.transport.close()
        else:
            logging.debug("Connection %s was already closed" % self.host)


def copy_all_recursively(server_object, file_list, dest_goat_path):
    logging.debug("List of files to be copied: %s " % file_list)
    for file_path in file_list:
        if [True for x in IGNORE_FILES if x in file_path]:
            logging.info("skipping %s. Since not required" % file_path)
            continue
        dest_path = "%s/%s" % (dest_goat_path, file_path)
        logging.debug("Full dest path per file: %s" % dest_path)
        if os.path.isfile(os.path.normpath(file_path)):
            logging.info('Copying file to %s%s/%s' % (GOAT_IP,
                                                     REMOTE_GOAT_LOCATION,
                                                     file_path))
            print('Copying file to %s%s/%s' % (GOAT_IP,
                                                     REMOTE_GOAT_LOCATION,
                                                     file_path))
            if not server_object.isdir(os.path.dirname(dest_path)):
                logging.info('creating dictionary %s' % (os.path.dirname(
                    dest_path)))
                server_object.sftp.mkdir(os.path.dirname(dest_path))
            server_object.upload(os.path.abspath(file_path), dest_path)
        elif os.path.isdir(os.path.normpath(file_path)):
            if not server_object.isdir(dest_path):
                logging.info("creating dictionary %s" % dest_path)
                server_object.sftp.mkdir(dest_path)
            inner_folder_contents = ["%s/%s" % (file_path, x) for x in
                                     os.listdir(file_path)]
            copy_all_recursively(server_object, inner_folder_contents,
                                 dest_goat_path)


def get_commited_files():
    updated_list = []
    logging.info("Checking older commited data")
    status_check_process = Popen(['git', 'cherry', '-v'], shell=False,
                                 stdout=PIPE, stderr=PIPE)
    status_output, status_err = status_check_process.communicate()
    logging.debug("git cherry output: %s" % status_output)
    if not status_output:
        pass
        # return updated_list
    logging.info("Getting older commited files")
    status_check_process = Popen(['git', 'show', '--name-only', '--oneline',
                                  'HEAD'], shell=False,
                                 stdout=PIPE, stderr=PIPE)
    status_output, status_err = status_check_process.communicate()
    file_list_with_data = status_output.splitlines()[1:]
    updated_list = []
    for x in file_list_with_data:
        x = x.decode("utf-8")
        updated_list.append(x.strip())
    return updated_list


def upload_change_to(ip, usr, pwd, dest_goat_path):
    print (__file__)
    # local_goat_path = os.path.dirname(os.path.dirname(__file__))
    local_goat_path = os.path.dirname(__file__)
    logging.info("local goat path : %s" % local_goat_path)
    os.chdir(local_goat_path)
    server_object = None
    try:
        server_object = Server(usr, pwd, ip)
        status_check_process = Popen(['git', 'status', '-s'], shell=False,
                                     stdout=PIPE, stderr=PIPE)
        status_output, status_err = status_check_process.communicate()
        logging.debug("git status output: %s" % status_output)
        file_list_with_data = status_output.splitlines()
        file_list = []
        for x in file_list_with_data:
            x = x.decode("utf-8")
            if x.startswith('R'):
                file_list.append(x.split()[3])
            else:
                file_list.append(x.split()[1])
        file_list.extend(get_commited_files())
        file_list = list(set(file_list))
        if dest_goat_path.endswith('/'):
            dest_goat_path = dest_goat_path[:-1]
        copy_all_recursively(server_object, file_list, dest_goat_path)
        logging.info("File copying completed")
    except Exception as e:
        print(e)
    finally:
        server_object.close()
        logging.debug("Connection closed")


if __name__ == '__main__':
    log_file = os.path.join(os.path.dirname(__file__),
                            "upload_changed_files_to_remote.log")
    logging.basicConfig(
        filename=log_file, format='%(asctime)s:%(levelname)-5.5s:%(message)s',
        datefmt='%m/%d/%Y %I:%M:%S %p IST', filemode='w', level=logging.DEBUG)
    print("Writing logs at %s" % log_file)
    upload_change_to(GOAT_IP, GOAT_USERNAME, GOAT_PWD, REMOTE_GOAT_LOCATION)
    print("Program Execution completed")