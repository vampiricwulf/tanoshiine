Vagrant.configure(2) do |config|
	config.vm.box = "ubuntu/trusty64"
	config.vm.provision "shell", type: "shell", privileged: false, inline: <<-USER
		echo "Updating virtual machine..."
		export DEBIAN_FRONTEND=noninteractive

        # ffmpeg PPA
        sudo add-apt-repository ppa:mc3man/trusty-media -y
		sudo apt-get -qq update        
		sudo apt-get -qq dist-upgrade -y       


    	#echo "Installing dependancies..."
        sudo apt-get -qq install -y ffmpeg build-essential redis-server\
        	software-properties-common git imagemagick nginx pngquant exiftool

		cd /vagrant
		# cd to tano's root on login
		echo 'cd /vagrant' >> ~/.profile

	
		echo "Installing npm modules. This will take a while..."
		# Node.js setup script
		wget --user=vagrant -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
		export NVM_DIR="$HOME/.nvm"
		[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
		[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

		nvm install 14.5.0
		cp ./config.js.example ./config.js
		sed -i -e 's/SERVE_STATIC_FILES: false/SERVE_STATIC_FILES: true/' ./config.js
		sed -i -e 's/SERVE_IMAGES: false/SERVE_IMAGES: true/' ./config.js
		cp ./hot.js.example ./hot.js
		cp ./report/config.js.example ./report/config.js
		cp ./imager/config.js.example ./imager/config.js
		sed -i -e 's/PNG_THUMBS: false/PNG_THUMBS: true/' ./imager/config.js
		sed -i -e 's/WEBM: false/WEBM: true/' ./imager/config.js
		sed -i -e 's/WEBM_AUDIO: false/WEBM_AUDIO: true/' ./imager/config.js
		sed -i -e 's/SVG: false/SVG: true/' ./imager/config.js
		sed -i -e 's/AUDIOFILES: false/AUDIOFILES: true/' ./imager/config.js
		sed -i -e 's/PDF: false/PDF: true/' ./imager/config.js
		sed -i -e 's/DEL_EXIF: false/DEL_EXIF: true/' ./imager/config.js
		npm install --no-bin-links
		exit
	USER

	# Server
	config.vm.network :forwarded_port, host: 8000, guest: 8000
	config.vm.network :forwarded_port, host: 80, guest: 8000
	config.vm.network :forwarded_port, host: 443, guest: 443

	# Node debug port
	config.vm.network :forwarded_port, host: 5858, guest: 5858

	config.vm.provider "virtualbox" do |v|
		v.customize ["modifyvm", :id, "--nataliasmode1", "proxyonly"]
	end
end
