ver=$(node -e "var fs = require('fs'); console.log(JSON.parse(fs.readFileSync('./package.json')).version);")
echo $ver > latest
aws s3 cp --acl=public-read latest s3://mapbox/mapbox-studio/latest
rm -f latest
echo "Latest build version at https://mapbox.s3.amazonaws.com/mapbox-studio/latest"
