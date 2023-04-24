let activeDevice = null;
let handles = {};
let bpo = null;
let allImages = {};

const IfName = {
    'plasma-mobile': 'Plasma Mobile',
    'phosh': 'Phosh',
    'gnome-mobile': 'Gnome Mobile',
    'sxmo-de-sway': 'SXMO Sway',
    'sxmo-de-dwm': 'SXMO Dwm',
}

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
        'name': 'shift-axolotl',
        'nicename': 'SHIFT 6MQ',
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

        for (let j = 0; j < devices.length; j++) {
            if (devices[j].name === codename) {
                result.push({
                    name: releaseName, interfaces: devices[j].interfaces,
                });
            }
        }
    }
    return result;
}

async function runScript(device, di, image, script) {
    const steplist = document.getElementById('steps');
    let stepElem = {};
    for (let i = 0; i < script.length; i++) {
        const step = script[i];
        const elem = document.createElement('LI');
        elem.innerHTML = step.name;
        steplist.appendChild(elem);
        stepElem[i] = elem;
    }

    for (let i = 0; i < script.length; i++) {
        const step = script[i];
        stepElem[i].style.color = '#090';
        if (i > 0) {
            stepElem[i - 1].style.color = '#aaa';
        }

        if ("cmd" in step) {
            let result = await fastbootCommand(device, step['cmd'])
            if (result[0] !== 'OKAY') {
                stepElem[i].style.color = '#f00';
                return;
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

            const xzResponse = await fetch(url);

            const contentLength = xzResponse.headers.get('content-length');
            dlprogress.max = parseInt(contentLength, 10);
            let received = 0;
            const res = new Response(new ReadableStream({
                async start(controller) {
                    const reader = xzResponse.body.getReader();
                    for (; ;) {
                        const {done, value} = await reader.read();
                        if (done) break;
                        received += value.byteLength;
                        dlprogress.value = received;
                        if (dlprogress.value === dlprogress.max) {
                            ss_dl.style.color = '#ddd';
                            ss_up.style.color = '#090';
                        }
                        controller.enqueue(value);
                    }
                    controller.close();
                }
            }));


            const reader = new xzwasm.XzReadableStream(res.body);
            await fastbootFlash(device, step['partition'], reader, rawSize, function (progress) {
                flashprogress.value = progress * 100;
                ss_up.style.color = '#ddd';
                ss_flash.style.color = '#090';
            });

            stepElem[i].removeChild(substeps);
        }
    }
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
    sdn.innerHTML = codename;

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
                        td_ui.innerHTML = IfName[IntfName];
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
                        td_ui.innerHTML = IfName[IntfName];
                        stable_row.appendChild(td_ui);
                        stable_row.appendChild(td_act);
                        const act_btn = document.createElement('BUTTON');
                        act_btn.innerHTML = 'pick';
                        act_btn.dataset.image = key;
                        act_btn.dataset.serial = serial;
                        act_btn.dataset.codename = codename;
                        act_btn.addEventListener('click', selectImage);
                        td_act.appendChild(act_btn);

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

                td_name.innerHTML = IfName[IntfName];
                td_release.innerHTML = releases[k]['name'];
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
        if (deviceinfo[i].filter['product'] === product) {
            if (codename === null) {
                codename = deviceinfo[i].name;
            }
            codenames.push(deviceinfo[i].name);
            row.dataset.codename = codename;
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
        td_name.innerText = di['nicename'];
        row.appendChild(td_name);
        const td_codename = document.createElement('TD');
        td_codename.innerText = di['name'];
        row.appendChild(td_codename);
        suppTable.appendChild(row);
    }
});