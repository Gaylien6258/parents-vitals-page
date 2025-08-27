document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('vitals-form');
    const vitalsList = document.getElementById('vitals-list');
    const patientSelect = document.getElementById('patient-select');
    const downloadPdfButton = document.getElementById('download-pdf');

    let vitalsChart;
    const patientNames = { mother: 'Susan', father: 'Gary' };

    const getPatientData = (patient) => {
        return JSON.parse(localStorage.getItem(`vitalsReadings-${patient}`)) || [];
    };

    const savePatientData = (patient, data) => {
        localStorage.setItem(`vitalsReadings-${patient}`, JSON.stringify(data));
    };

    const renderReadings = (patient) => {
        const readings = getPatientData(patient);
        vitalsList.innerHTML = '';
        if (readings.length === 0) {
            vitalsList.innerHTML = '<p style="text-align:center;">No readings yet.</p>';
            return;
        }
        readings.forEach((reading, index) => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <strong>Date:</strong> ${reading.date} <strong>Time:</strong> ${reading.time}<br>
                <strong>BP:</strong> ${reading.systolic}/${reading.diastolic} mmHg<br>
                <strong>HR:</strong> ${reading.heartrate} BPM<br>
                <strong>O2:</strong> ${reading.oxygen} %
            `;
            vitalsList.appendChild(listItem);
        });
    };

    const renderChart = (patient) => {
        const readings = getPatientData(patient);
        const dates = readings.map(r => r.date).reverse();
        const systolic = readings.map(r => parseInt(r.systolic)).reverse();
        const diastolic = readings.map(r => parseInt(r.diastolic)).reverse();
        const heartrate = readings.map(r => parseInt(r.heartrate)).reverse();
        const oxygen = readings.map(r => parseInt(r.oxygen)).reverse();

        const ctx = document.getElementById('vitals-chart').getContext('2d');

        if (vitalsChart) {
            vitalsChart.destroy();
        }

        vitalsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Systolic Pressure (mmHg)',
                    data: systolic,
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    tension: 0.1
                }, {
                    label: 'Diastolic Pressure (mmHg)',
                    data: diastolic,
                    borderColor: 'rgb(54, 162, 235)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    tension: 0.1
                }, {
                    label: 'Heart Rate (BPM)',
                    data: heartrate,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1
                }, {
                    label: 'Oxygen Saturation (%)',
                    data: oxygen,
                    borderColor: 'rgb(255, 206, 86)',
                    backgroundColor: 'rgba(255, 206, 86, 0.2)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    };

    const generatePdfReport = (patient) => {
        const readings = getPatientData(patient);
        const name = patientNames[patient];

        if (readings.length === 0) {
            alert(`No readings available for ${name}.`);
            return;
        }

        const doc = new window.jspdf.jsPDF();

        doc.setFontSize(22);
        doc.text(`Vitals Report for ${name}`, 10, 20);
        doc.setFontSize(12);
        doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 10, 30);

        // Add chart image
        const chartDataUrl = document.getElementById('vitals-chart').toDataURL('image/png');
        doc.addImage(chartDataUrl, 'PNG', 10, 40, 180, 100);

        doc.text('Recent Readings:', 10, 150);
        let yPos = 160;
        readings.forEach((reading, index) => {
            if (yPos > 280) {
                doc.addPage();
                yPos = 20;
            }
            doc.text(`${reading.date} ${reading.time} - BP: ${reading.systolic}/${reading.diastolic}, HR: ${reading.heartrate}, O2: ${reading.oxygen}`, 10, yPos);
            yPos += 10;
        });

        doc.save(`Vitals_Report_${name}_${new Date().toLocaleDateString()}.pdf`);
    };

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const patient = patientSelect.value;
        const systolic = document.getElementById('systolic').value;
        const diastolic = document.getElementById('diastolic').value;
        const heartrate = document.getElementById('heartrate').value;
        const oxygen = document.getElementById('oxygen').value;

        const now = new Date();
        const date = now.toLocaleDateString();
        const time = now.toLocaleTimeString();

        const newReading = {
            date,
            time,
            systolic,
            diastolic,
            heartrate,
            oxygen
        };

        const readings = getPatientData(patient);
        readings.unshift(newReading);
        savePatientData(patient, readings);

        document.getElementById('systolic').value = '';
        document.getElementById('diastolic').value = '';
        document.getElementById('heartrate').value = '';
        document.getElementById('oxygen').value = '';

        renderReadings(patient);
        renderChart(patient);
    });

    patientSelect.addEventListener('change', (event) => {
        renderReadings(event.target.value);
        renderChart(event.target.value);
    });

    downloadPdfButton.addEventListener('click', () => {
        const patient = patientSelect.value;
        generatePdfReport(patient);
    });

    // Initial render based on default selection
    renderReadings(patientSelect.value);
    renderChart(patientSelect.value);
});
