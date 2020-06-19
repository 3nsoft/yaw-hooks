#!/bin/sh

app_conf_file=/etc/webhooks/webhooks.yml
inst_folder=/usr/share/webhooks
systemd_folder=/lib/systemd/system

# code install location
mkdir -p deb-bin/DEBIAN deb-bin$inst_folder
cp -r webhook-app node deb-bin$inst_folder/

# run commands in a standard place
cp -r packing/deb/usr/bin deb-bin/usr/
chmod 755 deb-bin/usr/bin/*

# default config
cp -r packing/deb/etc deb-bin/

# systemd service
mkdir -p deb-bin$systemd_folder
./packing/write-service-file.sh $inst_folder $app_conf_file deb-bin$systemd_folder

# enumerating all files that will be controlled by deb
cd deb-bin
find . -type f | xargs md5sum > DEBIAN/md5sums
cd ..

# leave conf on uninstall
echo "$app_conf_file" > deb-bin/DEBIAN/conffiles

# post-install procedures
cp packing/deb/postinst deb-bin/DEBIAN/
chmod 755 deb-bin/DEBIAN/postinst

# pre-removal procedures
cp packing/deb/prerm deb-bin/DEBIAN/
chmod 755 deb-bin/DEBIAN/prerm

package_name="webhooks"
npm_version=$(node packing/deb/package-version.js webhook-app)
deb_version=${npm_version}-1
size_kb=$(du -ksc deb-bin/usr | grep total | cut -f1)

echo "
Package: $package_name
Version: $deb_version
Architecture: amd64
Section: administration
Maintainer: 3NSoft Inc <hq@3nsoft.com>
Installed-Size: $size_kb
Homepage: https://3nsoft.com
Description: Provides secure webhooks for administrative tasks
 $package_name provides simple and secure webhooks to run administrative tasks, expressed with shell scripts, run commands, and javascript scripts.
" > deb-bin/DEBIAN/control

dpkg --build deb-bin ${package_name}_${deb_version}.deb
