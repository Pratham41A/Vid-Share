import BackBlazeB2 from "backblaze-b2";

const b2 = new BackBlazeB2({
    applicationKeyId: process.env.BACKBLAZEB2APPLICATIONKEYID,
    applicationKey: process.env.BACKBLAZEB2APPLICATIONKEY
});


async function authorizeB2() {
    try {
        const {
            data: {
                downloadUrl,
                allowed: {
                    bucketId,
                    bucketName
                }
            }
        } = await b2.authorize();

        return {
            downloadUrl,
            bucketId,
            bucketName
        };

    } catch (error) {
        console.log('authorizeB2: ', error);
    }
}


async function getUploadInfo(bucketId) {
    try {
        const {
            data: {
                uploadUrl,
                authorizationToken
            }
        } = await b2.getUploadUrl({
            bucketId
        });

        return {
            uploadUrl,
            authorizationToken
        };

    } catch (error) {
        console.log('getUploadInfo: ', error);
    }
}


export async function getDownloadAuthorization() {
    try {
        const {
            bucketId
        } = await authorizeB2();

        const {
            data: {
                authorizationToken
            }
        } = await b2.getDownloadAuthorization({
            bucketId,
            fileNamePrefix: "",
            validDurationInSeconds: 604800 // 1 Week
        });

        return authorizationToken;

    } catch (error) {
        console.log('getDownloadAuthorization: ', error);
    }
}


// fileName = File Name + Extension
export async function uploadFile(fileName, data) {
    try {
        const {
            downloadUrl,
            bucketId,
            bucketName
        } = await authorizeB2();

        const {
            uploadUrl,
            authorizationToken
        } = await getUploadInfo(bucketId);

        await b2.uploadFile({
            uploadUrl,
            uploadAuthToken: authorizationToken,
            fileName,
            data
        });

        return `${downloadUrl}/file/${bucketName}/${fileName}`;

    } catch (error) {
        console.log('uploadFile: ', error);
    }
}
