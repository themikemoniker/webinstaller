let activeDevice = null;
let handles = {};
let bpo = null;
let allImages = {};

const deviceinfo = [
    {
        'name': 'oneplus-enchilada',
        'nicename': 'OnePlus 6',
        'filter': {
            'product': 'sdm845'
        },
        'script': [
            {"cmd": "erase:dtbo", name: "Erase DTBO partition"},
            {"flash": ".img.xz", partition: 'userdata', name: "Flash rootfs"},
            {"flash": "-boot.img.xz", partition: 'boot', name: "Flash boot partition"},
            {"cmd": "reboot", name: "Reboot"},
        ]
    },
    {
        'name': 'oneplus-fajita',
        'nicename': 'OnePlus 6T',
        'filter': {
            'product': 'sdm845'
        },
        'script': [
            {"cmd": "erase:dtbo", name: "Erase DTBO partition"},
            {"flash": ".img.xz", partition: 'userdata', name: "Flash rootfs"},
            {"flash": "-boot.img.xz", partition: 'boot', name: "Flash boot partition"},
            {"cmd": "reboot", name: "Reboot"},
        ]
    },
    {
        'name': 'shift-axolotl',
        'nicename': 'SHIFT SHIFT6mq',
        'filter': {
            'product': ['sdm845', 'SHIFT6mq']
        },
        'script': [
            {"cmd": "erase:dtbo", name: "Erase DTBO partition"},
            {"flash": ".img.xz", partition: 'userdata', name: "Flash rootfs"},
            {"flash": "-boot.img.xz", partition: 'boot', name: "Flash boot partition"},
            {"cmd": "reboot", name: "Reboot"},
        ]
    },
    {
        'name': 'xiaomi-scorpio',
        'nicename': 'Xiaomi Mi Note 2',
        'filter': {
            'product': 'MSM8996_A4',
        },
        'script': [
            {"flash": ".img.xz", partition: 'userdata', name: "Flash rootfs"},
            {"flash": "-boot.img.xz", partition: 'boot', name: "Flash boot partition"},
            {"cmd": "reboot", name: "Reboot"},
        ]
    },
    {
        'name': 'fairphone-fp4',
        'nicename': 'Fairphone 4',
        'filter': {
            'product': 'FP4'
        },
        'script': [
            {"cmd": "erase:dtbo", name: "Erase DTBO partition"},
            {"flash": ".img.xz", partition: 'userdata', name: "Flash rootfs"},
            {"flash": "-boot.img.xz", partition: 'boot', name: "Flash boot partition"},
            {"cmd": "reboot", name: "Reboot"},
        ]
    },
    {
        'name': 'fairphone-fp5',
        'nicename': 'Fairphone 5',
        'filter': {
            'product': 'FP5'
        },
        'script': [
            {"cmd": "erase:dtbo", name: "Erase DTBO partition"},
            {"cmd": "erase:vendor_boot", name: "Erase vendor_boot partition"},
            {"flash": ".img.xz", partition: 'userdata', name: "Flash rootfs"},
            {"flash": "-boot.img.xz", partition: 'boot', name: "Flash boot partition"},
            {"cmd": "reboot", name: "Reboot"},
        ]
    },
];

function readableFileSize(size) {
    var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var i = 0;
    while (size >= 1024) {
        size /= 1024;
        ++i;
    }
    return size.toFixed(1) + ' ' + units[i];
}

function sortRelease(a, b) {
    const nameA = a['name'];
    const nameB = b['name'];
    if (nameA === 'edge') {
        return 1;
    }
    if (nameB === 'edge') {
        return -1;
    }
    return ((nameA < nameB) ? -1 : ((nameA > nameB) ? 1 : 0));
}

function filterReleases(codename) {
    let result = [];
    const releases = bpo.releases;
    for (let i = 0; i < releases.length; i++) {
        const devices = releases[i].devices;
        const releaseName = releases[i].name;
        const releasePrettyName = releases[i].name;

        for (let j = 0; j < devices.length; j++) {
            if (devices[j].name === codename) {
                result.push({
                    name: releaseName,
                    pretty_name: releasePrettyName,
                    interfaces: devices[j].interfaces,
                });
            }
        }
    }
    return result;
}

function getDevicePrettyName(codename) {
    const releases = bpo.releases;
    for (let i = 0; i < releases.length; i++) {
        const devices = releases[i].devices;
        const releaseName = releases[i].name;

        for (let j = 0; j < devices.length; j++) {
            if (devices[j].name === codename) {
                return devices[j].pretty_name;
            }
        }
    }
    return undefined;
}

function flasherError(message) {
    const div = document.getElementById('flasher-error');
    div.classList.add('error');
    div.innerHTML = message;
}

async function runScript(device, di, image, script) {
    console.log("di")
    console.log(di)
    console.log("image")
    console.log(image)
    console.log("script")
    console.log(script)
    console.log("fromRaw")
    console.log(fromRaw)
    di = deviceinfo[0];
    image = {
        "-boot.img.xz": {
            "name": "boot.img.xz",
            // "timestamp": "2024-11-13T06:19:00",
            // "size": 18484820,
            "url": "https://elasticbeanstalk-us-west-2-190312923858.s3.us-west-2.amazonaws.com/boot.img.xz",
            // "sha256": "f54c6e9c5a54cac4617465b018f4cfb6a526f8c4d527b755e72aa711fa774c1c",
            // "sha512": "d51e14715b4fff552a5075ceeb3de4f79525e9c224e7aa69e51ea9dbdfa9de2475e83ff3d2e4af0793fd425c81f9bed55066385115b421929e7fbd638d76e0a5"
        },
        ".img.xz": {
            "name": "system.img.xz",
            // "timestamp": "2024-11-13T06:19:00",
            // "size": 730042556,
            "url": "https://elasticbeanstalk-us-west-2-190312923858.s3.us-west-2.amazonaws.com/system.img.xz",
            // "sha256": "97bee0c367a55582f0eaacd9ef804bfdd0c9e8d8878fe5504722dcf553e56cfd",
            // "sha512": "9dd5faa888292d8cd00e8be951033f9ee1e2a1a25da29eefd739208b10fae895be06d6f927bb3598e6c23faa44a66e9f49ccde7aa7c4623caa7bb3365f51f281"
        }
    }
    script = [
        {"cmd": "erase:dtbo", name: "Erase DTBO partition"},
        {"flash": ".img.xz", partition: 'userdata', name: "Flash rootfs"},
        {"flash": "-boot.img.xz", partition: 'boot', name: "Flash boot partition"},
        {"cmd": "reboot", name: "Reboot"},
    ];

    const steplist = document.getElementById('steps');
    const startButton = document.getElementById('start');
    let stepElem = {};
    for (let i = 0; i < script.length; i++) {
        const step = script[i];
        const elem = document.createElement('LI');
        elem.innerHTML = step.name;
        steplist.appendChild(elem);
        stepElem[i] = elem;
    }

    const imageName = document.getElementById('image-name');
    imageName.innerHTML = image[".img.xz"].name;

    startButton.addEventListener('click', async function () {
        startButton.setAttribute('disabled', 'disabled');
        for (let i = 0; i < script.length; i++) {
            const step = script[i];
            stepElem[i].style.color = '#090';
            if (i > 0) {
                stepElem[i - 1].style.color = '#aaa';
            }

            if ("cmd" in step) {
                try {
                    let result = await fastbootCommand(device, step['cmd'])
                    if (result[0] !== 'OKAY') {
                        stepElem[i].style.color = '#f00';
                        flasherError("Fastboot command failed: " + step['cmd'] + '<br>' + result[1]);
                        return;
                    }
                } catch (err) {
                    if (err instanceof DOMException) {
                        stepElem[i].style.color = '#f00';
                        flasherError("Fastboot command failed: <br>" + err.message);
                        return;
                    }
                }
            } else if ("flash" in step) {
                const suffix = step["flash"];
                const url = image[suffix].url;
                const rawSize = image[suffix].size;
                console.log("Flashing", url);

                const substeps = document.createElement('OL');
                substeps.style.display = 'block';
                substeps.style.color = 'black';
                stepElem[i].appendChild(substeps);

                const ss_dl = document.createElement('LI');
                ss_dl.innerHTML = 'Download';
                ss_dl.classList.add('progress-step');
                ss_dl.style.color = '#090';
                substeps.appendChild(ss_dl);

                const ss_up = document.createElement('LI');
                ss_up.innerHTML = 'Unpack';
                substeps.appendChild(ss_up);


                const ss_flash = document.createElement('LI');
                ss_flash.innerHTML = 'Flash';
                ss_flash.classList.add('progress-step');
                substeps.appendChild(ss_flash);


                const dlprogress = document.createElement('PROGRESS');
                const flashprogress = document.createElement('PROGRESS');
                flashprogress.max = 100;
                flashprogress.value = 0;
                ss_dl.appendChild(dlprogress);
                ss_flash.appendChild(flashprogress);

                try {
                    const xzResponse = await fetch(url);
                    const rawBuffer = await xzResponse.arrayBuffer(); // Get raw image buffer
                
                    // Convert the raw image to sparse format using fromRaw
                    const sparseBuffer = fromRaw(rawBuffer);
                
                    // Pass the sparse image to the fastbootFlash process
                    const sparseBlob = new Blob([sparseBuffer]);
                    const res = new Response(sparseBlob);
                
                    const reader = new xzwasm.XzReadableStream(res.body);
                    await fastbootFlash(device, step['partition'], reader, rawSize, function (progress) {
                        flashprogress.value = progress * 100;
                        ss_up.style.color = '#ddd';
                        ss_flash.style.color = '#090';
                    });
                
                    stepElem[i].removeChild(substeps);
                } catch (err) {
                    console.error(err);
                    throw new Error("Flasher failed");
                }
            }
        }
    });
}

function selectImage(event) {
    activeDevice = handles[this.dataset.serial];
    const codename = this.dataset.codename;
    const serial = this.dataset.serial;
    const imageKey = this.dataset.image;
    const oldScreen = document.getElementById('selection');
    const newScreen = document.getElementById('flasher');
    oldScreen.style.display = 'none';
    newScreen.style.display = 'block';
    const image = allImages[imageKey][Object.keys(allImages[imageKey])[0]];

    let di = null;
    for (let i = 0; i < deviceinfo.length; i++) {
        if (deviceinfo[i].name === codename) {
            di = deviceinfo[i];
        }
    }
    const steps = di['script'];

    runScript(activeDevice, di, allImages[imageKey], steps);
}

function selectDevice(event) {
    activeDevice = handles[this.dataset.serial];
    const codename = this.dataset.codename;
    const serial = this.dataset.serial;

    const sdn = document.getElementById('select-device-name');
    sdn.innerHTML = getDevicePrettyName(codename);

    const sdpn = document.getElementById('select-device-codename');
    sdpn.innerHTML = codename;

    console.log('Using device', activeDevice);
    const oldScreen = document.getElementById('supported');
    const newScreen = document.getElementById('selection');
    oldScreen.style.display = 'none';
    newScreen.style.display = 'block';

    const edgeImageTable = document.getElementById('edge-images');
    const latestStableTable = document.getElementById('stable-images');
    const oldTable = document.getElementById('old-images');

    const releases = filterReleases(codename);
    releases.sort(sortRelease);
    releases.reverse();
    let latestRelease = null;
    if (releases.length > 1) {
        latestRelease = releases[1]['name'];
    }
    let edgeUI = new Set();
    let stableUI = new Set();

    for (let k = 0; k < releases.length; k++) {
        for (let i = 0; i < releases[k]['interfaces'].length; i++) {
            const IntfName = releases[k]['interfaces'][i]['name'];
            const IntfPrettyName = releases[k]['interfaces'][i].pretty_name;

            let realImages = {};
            for (let j = 0; j < releases[k]['interfaces'][i]['images'].length; j++) {
                const image = releases[k]['interfaces'][i]['images'][j];
                const part = image['name'].split(codename);
                if (!(part[0] in realImages)) {
                    realImages[part[0]] = {};
                }
                realImages[part[0]][part[1]] = image;
            }
            for (let key in realImages) {

                // The filenames should be fully unique
                allImages[key] = realImages[key];

                if (k === 0) {
                    // Edge images
                    if (!edgeUI.has(IntfName)) {
                        edgeUI.add(IntfName);
                        const edge_row = document.createElement('TR');
                        const td_ui = document.createElement('TD');
                        const td_act = document.createElement('TD');
                        td_ui.innerHTML = IntfPrettyName;
                        edge_row.appendChild(td_ui);
                        edge_row.appendChild(td_act);
                        const act_btn = document.createElement('BUTTON');
                        act_btn.innerHTML = 'pick';
                        act_btn.dataset.image = key;
                        act_btn.dataset.serial = serial;
                        act_btn.dataset.codename = codename;
                        act_btn.addEventListener('click', selectImage);

                        td_act.appendChild(act_btn);

                        edgeImageTable.appendChild(edge_row);
                    }
                } else if (k === 1) {
                    // Latest stable
                    if (!stableUI.has(IntfName)) {
                        stableUI.add(IntfName);
                        const stable_row = document.createElement('TR');
                        const td_ui = document.createElement('TD');
                        const td_act = document.createElement('TD');
                        td_ui.innerHTML = IntfPrettyName;
                        stable_row.appendChild(td_ui);
                        stable_row.appendChild(td_act);
                        const act_btn = document.createElement('BUTTON');
                        act_btn.innerHTML = 'pick';
                        act_btn.dataset.image = key;
                        act_btn.dataset.serial = serial;
                        act_btn.dataset.codename = codename;
                        act_btn.addEventListener('click', selectImage);
                        td_act.appendChild(act_btn);

                        const stableVersionPretty = document.getElementById('stable-version');
                        stableVersionPretty.innerHTML = releases[k].pretty_name;

                        latestStableTable.appendChild(stable_row);
                    }
                }

                const image = realImages[key][Object.keys(realImages[key])[0]];
                let row = document.createElement('TR');
                oldTable.appendChild(row);

                const td_name = document.createElement('TD');
                const td_release = document.createElement('TD');
                const td_date = document.createElement('TD');
                const td_action = document.createElement('TD');
                row.appendChild(td_name);
                row.appendChild(td_release);
                row.appendChild(td_date);
                row.appendChild(td_action);

                td_name.innerHTML = IntfPrettyName;
                td_release.innerHTML = releases[k].pretty_name;
                td_date.innerHTML = image['timestamp'];

                const btn = document.createElement('BUTTON');
                btn.innerHTML = 'pick';
                btn.dataset.image = key;
                btn.dataset.serial = serial;
                btn.dataset.codename = codename;
                btn.addEventListener('click', selectImage);

                td_action.appendChild(btn);
            }

        }
    }


}

async function fastbootCheckResponse(device) {
    const resultPacket = await device.transferIn(1, 64);
    const result = new TextDecoder().decode(resultPacket.data);

    const statusCode = result.substring(0, 4);
    const data = result.substring(4);
    console.debug('IN', statusCode, data);
    if (statusCode === 'INFO') {
        console.info(data);
        return await fastbootCheckResponse(device);
    }
    return [statusCode, data];
}

async function fastbootCommand(device, command) {
    if (device === null) {
        console.error("Cannot run fastboot command without connected device");
        return;
    }
    console.debug('OUT', command);
    const packet = new TextEncoder().encode(command);
    await device.transferOut(1, packet);
    return await fastbootCheckResponse(device);
}

async function fastbootGetvar(device, name) {
    const res = await fastbootCommand(device, "getvar:" + name);
    if (res[0] !== "OKAY") {
        console.error(res[1]);
        return undefined;
    }
    return res[1];
}

async function fastbootRaw(device, data, progress) {
    const size = data.byteLength;
    const chunksize = 16384;
    let i = 0;
    let left = size;
    while (left > 0) {
        const chunk = data.slice(i * chunksize, (i + 1) * chunksize);
        await device.transferOut(1, chunk);
        left -= chunk.byteLength;
        i += 1;
        if (i % 8 === 0) {
            progress(1 - (left / size));
        }
    }
    progress(1.0);
}

async function fastbootDownload(device, partition, split, progress) {
    const size = split.data.byteLength;
    const sizeHex = size.toString(16).padStart(8, "0");

    let res = await fastbootCommand(device, 'download:' + sizeHex);
    if (res[0] !== 'DATA') {
        console.error('Failed download command', res[1]);
    }
    await fastbootRaw(device, split.data, progress);
    return await fastbootCheckResponse(device);
}

async function fastbootFlash(device, partition, reader, rawsize, progress) {
    const MB = 1024 * 1024;
    let size = rawsize;
    const response = new Response(reader);

    // Add a slot suffix if needed
    let has_slot = await fastbootGetvar(device, 'has-slot:' + partition) === "yes";
    if (has_slot) {
        let slot = await fastbootGetvar(device, 'current-slot');
        partition += '_' + slot;
    }

    // Determine max-download-size
    let max_download_size = await fastbootGetvar(device, 'max-download-size');
    if (max_download_size !== undefined) {
        if (!isNaN(max_download_size) && !isNaN(parseFloat(max_download_size))) {
            max_download_size = parseInt(max_download_size, 10);
        } else {
            max_download_size = parseInt(max_download_size, 16);
        }
    } else {
        max_download_size = 512 * MB;
    }
    console.log('max-download-size', readableFileSize(max_download_size));
    const blob = await response.blob();

    // Deal with logical partitions
    const is_logical = await fastbootGetvar(device, 'is-logical:' + partition) === 'yes';
    if (is_logical) {
        fastbootCommand(device, 'resize-logical-partition:' + partition + ':0');
        fastbootCommand(device, 'resize-logical-partition:' + partition + ':' + size);
    }
    let splits = 0;
    let sent = 0;
    for await(let split of sparse.splitBlob(blob, Math.max(300 * MB, max_download_size * 0.8))) {
        await fastbootDownload(device, partition, split, function (fraction) {
            // Convert chunk progress to overall progress
            progress((sent + fraction * split.bytes) / size);
        });
        await fastbootCommand(device, 'flash:' + partition);
        splits += 1;
        sent += split.bytes;
    }
}

function updateReleasesRow(tr) {
    const codename = tr.dataset.codename;
    const serial = tr.dataset.serial;
    let releases = [];
    if (bpo !== null && codename !== null) {
        for (let i = 0; i < bpo.releases.length; i++) {
            let releaseName = bpo.releases[i].name;
            for (let j = 0; j < bpo.releases[i].devices.length; j++) {
                if (bpo.releases[i].devices[j].name === codename) {
                    releases.push({
                        'name': releaseName, 'builds': bpo.releases[i].devices[j].interfaces
                    });
                }
            }
        }
    }

    const td_product = document.querySelector('#devices tr[data-serial="' + serial + '"] td.col-product');
    const td_pick = document.querySelector('#devices tr[data-serial="' + serial + '"] td.col-pick');

    const bubbles = document.querySelectorAll('#devices tr[data-serial="' + serial + '"] span.release');
    for (let i = 0; i < bubbles.length; i++) {
        td_product.removeChild(bubbles[i]);
    }
    td_pick.innerHTML = '';

    releases.sort(sortRelease);
    releases.reverse();

    for (let i = 0; i < releases.length; i++) {
        const bubble = document.createElement('SPAN');
        bubble.classList.add('release');
        bubble.classList.add('label-latest');
        bubble.innerText = releases[i]['name'];
        td_product.appendChild(bubble);
    }
    if (releases.length > 0) {
        const btn = document.createElement('BUTTON');
        btn.innerHTML = '&raquo;';
        btn.dataset.serial = serial;
        btn.dataset.codename = codename;
        btn.addEventListener('click', selectDevice);
        td_pick.appendChild(btn);
    }
}

function updateReleases() {
    const rows = document.querySelectorAll('#devices tr');
    for (let i = 0; i < rows.length; i++) {
        updateReleasesRow(rows[i]);
    }
}

async function onConnectDevice(device) {
    console.log('connect', device);

    const table = document.getElementById('devices');

    const existing = document.querySelectorAll('#devices tr[data-serial="' + device.serialNumber + '"]');
    if (existing.length > 0) {
        return;
    }

    const row = document.createElement('TR');
    row.dataset.vid = device.vendorId;
    row.dataset.pid = device.productId;
    row.dataset.serial = device.serialNumber;

    const td_serial = document.createElement('TD');
    const td_product = document.createElement('TD');
    td_product.classList.add('col-product');
    const td_slot = document.createElement('TD');
    const td_pick = document.createElement('TD');
    td_pick.classList.add('col-pick');

    td_product.innerHTML = '<div class="spinner"></div>';
    td_slot.innerHTML = '<div class="spinner"></div>';

    td_serial.style.fontFamily = 'monospace';
    td_serial.innerHTML = device.serialNumber;
    row.appendChild(td_serial);
    row.appendChild(td_product);
    row.appendChild(td_slot);
    row.appendChild(td_pick);
    table.appendChild(row);

    try {
        await device.open();
    } catch (err) {
        console.error(err);
    }
    try {
        await device.reset();
    } catch (err) {
        console.error(err);
    }

    try {
        await device.selectConfiguration(1);
    } catch (err) {
        console.error(err);
    }
    try {
        await device.claimInterface(0);
    } catch (err) {
        console.error(err);
    }

    const product = await fastbootGetvar(device, "product");
    let slot = await fastbootGetvar(device, "current-slot");
    if (slot === "") {
        slot = undefined;
    }
    let unlocked = await fastbootGetvar(device, "unlocked");
    if (unlocked === "yes") {
        unlocked = true;
    } else if (unlocked === undefined || unlocked === "") {
        unlocked = true;
    } else {
        unlocked = false;
    }


    let codename = null;
    let codenames = [];
    for (let i = 0; i < deviceinfo.length; i++) {
        let checklist = [];
        if (Array.isArray(deviceinfo[i].filter['product'])) {
            checklist = deviceinfo[i].filter['product'];
        } else {
            checklist = [deviceinfo[i].filter['product']];
        }
        for (let j = 0; j < checklist.length; j++) {
            if (checklist[j] === product) {
                if (codename === null) {
                    codename = deviceinfo[i].name;
                }
                codenames.push(deviceinfo[i].name);
                row.dataset.codename = codename;
                break;
            }
        }
    }
    if (codename === null) {
        td_product.innerHTML = 'Unknown device (' + product + ')';
    } else {
        if (codenames.length > 1) {
            let selector = document.createElement('SELECT');
            for (let c = 0; c < codenames.length; c++) {
                const option = document.createElement('OPTION');
                option.value = codenames[c];
                option.innerText = codenames[c];
                selector.appendChild(option);
            }
            td_product.innerText = '';
            td_product.appendChild(selector);
            selector.setAttribute("onchange", "changeCodename(this)");
        } else {
            td_product.innerHTML = codename;
        }
    }
    if (!unlocked) {
        td_product.innerHTML += ' [locked]';
    }

    if (slot !== undefined) {
        td_slot.innerHTML = 'Slot ' + slot.toUpperCase();
    } else {
        td_slot.innerHTML = 'No slots';
    }

    updateReleases();
    handles[device.serialNumber] = device;
}

function changeCodename(widget) {
    const row = widget.parentElement.parentElement;
    row.dataset.codename = widget.value;
    updateReleases();
    return true;
}

function onConnect(event) {
    onConnectDevice(event.device);
}

function onDisonnect(event) {
    const device = event.device;
    const rows = document.querySelectorAll('#devices tr[data-serial=' + device.serialNumber + ']');
    const table = document.getElementById('devices');
    for (let i = 0; i < rows.length; i++) {
        table.removeChild(rows[i]);
    }
    console.log('disconnect', event);
}


document.addEventListener("DOMContentLoaded", async function () {
    if (navigator.usb === undefined) {
        const div = document.getElementById('nosupport');
        div.style.display = 'block';
        console.error("No webusb support");
        return;
    }
    const supportwrapper = document.getElementById('supported');
    supportwrapper.style.display = 'block';

    let devices = await navigator.usb.getDevices();
    for (let i = 0; i < devices.length; i++) {
        onConnectDevice(devices[i]);
    }

    navigator.usb.addEventListener('connect', onConnect);
    navigator.usb.addEventListener('disconnect', onDisonnect);

    const requestDeviceButton = document.getElementById('request-device');
    requestDeviceButton.addEventListener('click', async function (event) {
        event.preventDefault();
        let device;
        try {
            device = await navigator.usb.requestDevice({
                filters: [{
                    classCode: 0xFF, subclassCode: 0x42, protocolCode: 0x03,
                },],
            });
        } catch (err) {
            // No device selected
            console.error(err);
        }
        if (device !== undefined) {
            onConnectDevice(device);
        }
    });

    fetch('https://images.postmarketos.org/bpo/index.json').then(function (response) {
        // TODO: 1 hardcode json response

        return response.json();
    }).then(function (data) {
        bpo = data;
        updateReleases();
    });

    const suppTable = document.getElementById('supporteddevices');
    for (let i = 0; i < deviceinfo.length; i++) {
        const di = deviceinfo[i];
        const row = document.createElement('TR');
        const td_name = document.createElement('TD');
        const name_link = document.createElement('A');
        name_link.href = 'https://wiki.postmarketos.org/wiki/' + di['name'];
        name_link.innerText = di['nicename'];
        td_name.appendChild(name_link);
        row.appendChild(td_name);
        const td_codename = document.createElement('TD');
        td_codename.innerText = di['name'];
        row.appendChild(td_codename);
        suppTable.appendChild(row);
    }
});

document.getElementById("flash-images").addEventListener("click", async () => {
    const bootFileInput = document.getElementById("boot-image-file");
    const systemFileInput = document.getElementById("system-image-file");
    const button = document.getElementById("flash-images");

    // Disable button and show loading state
    button.disabled = true;
    button.textContent = "Flashing...";

    // if (bootFileInput.files.length === 0 || systemFileInput.files.length === 0) {
    //     alert("Please select both boot and system images before flashing.");
    //     button.disabled = false;
    //     button.textContent = "Flash Images";
    //     return;
    // }

    const bootImageBlob = bootFileInput.files[0];
    const systemImageBlob = systemFileInput.files[0];

    try {
        // Flash boot image
        console.log("Flashing boot image...");
        await new Promise(resolve => setTimeout(resolve, 0)); // Allow UI update
        await flashImage("boot", bootImageBlob);

        // // Flash system image
        // console.log("Flashing system image...");
        // await new Promise(resolve => setTimeout(resolve, 0)); // Allow UI update
        // await flashImage("userdata", systemImageBlob);

        alert("Flashing completed successfully!");
    } catch (error) {
        console.error("Flashing error:", error);
        alert("An error occurred during flashing.");
    } finally {
        // Re-enable button and reset text
        button.disabled = false;
        button.textContent = "Flash Images";
    }
});

async function flashImage(partition, imageBlob) {
    console.log(`Preparing to flash ${partition}...`);
    const reader = new Response(imageBlob).body; // Stream for flashing
    await fastbootFlash(activeDevice, partition, reader, imageBlob.size, progress => {
        console.log(`Flashing ${partition}: ${Math.round(progress * 100)}%`);
    });
}