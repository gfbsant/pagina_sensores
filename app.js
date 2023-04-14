const form = document.getElementById('form-csv');
const report = document.getElementById('report');
const selectedFiles = document.getElementById('selected-files');
const sensorButtons = document.getElementById('sensor-buttons');


let sensorAverages = null;



form.addEventListener('submit', (e) => {
  e.preventDefault();

  while (report.firstChild) {
    report.removeChild(report.firstChild);
  }

  const formData = new FormData();
  const files = document.querySelector('[name="csv-files[]"]').files;

  //crie um array com as datas dos arquivos selecionados 
  const fileDates = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    formData.append('csv-files[]', file);
    fileDates.push(file.name);
  }

  // Cria um array com os títulos dos arquivos selecionados
  const fileTitles = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    formData.append('csv-files[]', file);
    fileTitles.push(file.name);
  }

  // Exibe os títulos dos arquivos selecionados na página
  selectedFiles.textContent = `Arquivos selecionados: ${fileTitles.join(', ')}`;

  // Processa os arquivos .csv e calcula as médias de temperatura e umidade para cada sensor
  processCsvFiles(files)
    .then((sensorAverages) => {
      // Exibe as médias na página
      const table = document.createElement('table');
      const thead = document.createElement('thead');
      const tbody = document.createElement('tbody');
      const headRow = document.createElement('tr');
      const sensorHeader = document.createElement('th');
      const temperatureHeader = document.createElement('th');
      const humidityHeader = document.createElement('th');
      const minDateHeader = document.createElement('th');
      const maxDateHeader = document.createElement('th');


      sensorHeader.textContent = 'Sensor';
      temperatureHeader.textContent = 'Média de temperatura';
      humidityHeader.textContent = 'Média de umidade';
      minDateHeader.textContent = 'Data inicial';
      maxDateHeader.textContent = 'Data final';

      headRow.appendChild(sensorHeader);
      headRow.appendChild(temperatureHeader);
      headRow.appendChild(humidityHeader);
      headRow.appendChild(minDateHeader);
      headRow.appendChild(maxDateHeader);
      thead.appendChild(headRow);

      for (const sensor in sensorAverages) {
        if (sensor !== 'undefined') {
          const sensorRow = document.createElement('tr');
          const sensorName = document.createElement('td');
          const temperature = document.createElement('td');
          const humidity = document.createElement('td');
          const minDateCell = document.createElement('td');
          const maxDateCell = document.createElement('td');

          sensorName.textContent = sensor.replace(/[áàãâä]/gi, 'a')
            .replace(/[éèêë]/gi, 'e')
            .replace(/[íìîï]/gi, 'i')
            .replace(/[óòõôö]/gi, 'o')
            .replace(/[úùûü]/gi, 'u')
            .replace(/\uFFFD/g, 'º');
          temperature.textContent = sensorAverages[sensor].temperature;
          humidity.textContent = sensorAverages[sensor].humidity;
          minDateCell.textContent = sensorAverages[sensor].minDate;
          maxDateCell.textContent = sensorAverages[sensor].maxDate;

          sensorRow.appendChild(sensorName);
          sensorRow.appendChild(temperature);
          sensorRow.appendChild(humidity);
          sensorRow.appendChild(minDateCell);
          sensorRow.appendChild(maxDateCell);
          tbody.appendChild(sensorRow);
        }
      }

      table.appendChild(thead);
      table.appendChild(tbody);
      report.appendChild(table);
    })
    .catch((error) => {
      console.error('Erro ao gerar relatório:', error);
      report.textContent = 'Ocorreu um erro ao gerar o relatório. Por favor, tente novamente.';
    });
});

// Função para extrair a temperatura e a umidade da coluna "Formatted Value"
function extractTemperatureAndHumidityFromFormattedValue(formattedValue) {
  if (!formattedValue) {
    return { temperature: null, humidity: null };
  }

  const humidityMatch = formattedValue.match(/^(\d+(?:\.\d+)?)/);
  const temperatureMatch = formattedValue.match(/^(?:\d{1,3}(\.\d{1,2})?\% @ )?(\d{1,3}(\.\d{1,2})?)/);
  const humidity = humidityMatch ? parseFloat(humidityMatch[1]) : null;
  const temperature = temperatureMatch ? parseFloat(temperatureMatch[2]) : null;
  return { temperature, humidity };
}

function extractDateFromString(dateString) {
  if (!dateString) {
    return null; // retorna null se a string estiver vazia ou nula
  }

  const [date] = dateString.split(' ');
  const [month, day, year] = date.split('/');

  // Subtrai 1 do valor do mês para corrigir o problema
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}





function processCsvFile(file) {
  console.log('processCsvFile called with', file.name);
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const sensorData = {};

        // Itera sobre cada linha do arquivo e extrai a temperatura, a umidade e a data
        for (const row of results.data) {
          const { temperature, humidity } = extractTemperatureAndHumidityFromFormattedValue(row['Formatted Value']);
          const date = extractDateFromString(row['Date']);

          // Agrupa os valores por sensor
          if (!sensorData[row['Sensor Name']]) {
            sensorData[row['Sensor Name']] = {
              temperatureSum: 0,
              temperatureCount: 0,
              humiditySum: 0,
              humidityCount: 0,
              minDate: null,
              maxDate: null,
            };
          }

          if (temperature) {
            sensorData[row['Sensor Name']].temperatureSum += temperature;
            sensorData[row['Sensor Name']].temperatureCount++;
          }

          if (humidity) {
            sensorData[row['Sensor Name']].humiditySum += humidity;
            sensorData[row['Sensor Name']].humidityCount++;
          }

          if (date) {
            if (!sensorData[row['Sensor Name']].minDate || date < sensorData[row['Sensor Name']].minDate) {
              sensorData[row['Sensor Name']].minDate = date;
            }

            if (!sensorData[row['Sensor Name']].maxDate || date > sensorData[row['Sensor Name']].maxDate) {
              sensorData[row['Sensor Name']].maxDate = date;
            }
          }
        }

        // Calcula as médias de temperatura e umidade para cada sensor
        const sensorAverages = {};
        for (const sensor in sensorData) {
          const temperatureAverage = sensorData[sensor].temperatureSum / sensorData[sensor].temperatureCount;
          const humidityAverage = sensorData[sensor].humiditySum / sensorData[sensor].humidityCount;
          const minDate = sensorData[sensor].minDate;
          const maxDate = sensorData[sensor].maxDate;

          sensorAverages[sensor] = {
            temperature: temperatureAverage.toFixed(2),
            humidity: humidityAverage.toFixed(2),
            minDate,
            maxDate,
          };
        }

        resolve(sensorAverages);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

function processCsvFiles(files) {
  return Promise.all(Array.from(files).map(processCsvFile)).then((results) => {
    // Combina os resultados de cada arquivo em um único objeto
    const combinedData = results.reduce((combined, current) => {
      for (const sensor in current) {
        if (!combined[sensor]) {
          combined[sensor] = {
            temperatureSum: 0,
            temperatureCount: 0,
            humiditySum: 0,
            humidityCount: 0,
            minDate: null,
            maxDate: null,
          };
        }

        combined[sensor].temperatureSum += parseFloat(current[sensor].temperature);
        combined[sensor].temperatureCount++;
        combined[sensor].humiditySum += parseFloat(current[sensor].humidity);
        combined[sensor].humidityCount++;
        if (!combined[sensor].minDate || current[sensor].minDate < combined[sensor].minDate) {
          combined[sensor].minDate = current[sensor].minDate;
        }

        if (!combined[sensor].maxDate || current[sensor].maxDate > combined[sensor].maxDate) {
          combined[sensor].maxDate = current[sensor].maxDate;
        }
      }
      return combined;
    }, {});

    // Calcula as médias de temperatura e umidade para cada sensor
    const sensorAverages = {};
    for (const sensor in combinedData) {
      const temperatureAverage = combinedData[sensor].temperatureSum / combinedData[sensor].temperatureCount;
      const humidityAverage = combinedData[sensor].humiditySum / combinedData[sensor].humidityCount;
      const minDate = combinedData[sensor].minDate;
      const maxDate = combinedData[sensor].maxDate;

      sensorAverages[sensor] = {
        temperature: temperatureAverage.toFixed(2),
        humidity: humidityAverage.toFixed(2),
        maxDate: new Date(maxDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),        
        minDate: new Date(minDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      };
    }

    return sensorAverages;

  });
}











