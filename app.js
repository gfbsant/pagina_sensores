const form = document.getElementById('form-csv');
const report = document.getElementById('report');
const selectedFiles = document.getElementById('selected-files');

form.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData();
    const files = document.querySelector('[name="csv-files[]"]').files;

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

            sensorHeader.textContent = 'Sensor';
            temperatureHeader.textContent = 'Média de temperatura';
            humidityHeader.textContent = 'Média de umidade';

            headRow.appendChild(sensorHeader);
            headRow.appendChild(temperatureHeader);
            headRow.appendChild(humidityHeader);
            thead.appendChild(headRow);

            for (const sensor in sensorAverages) {
                if (sensor !== 'undefined') {
                    const sensorRow = document.createElement('tr');
                    const sensorName = document.createElement('td');
                    const temperature = document.createElement('td');
                    const humidity = document.createElement('td');

                    sensorName.textContent = sensor.replace(/[áàãâä]/gi, 'a')
                        .replace(/[éèêë]/gi, 'e')
                        .replace(/[íìîï]/gi, 'i')
                        .replace(/[óòõôö]/gi, 'o')
                        .replace(/[úùûü]/gi, 'u')
                        .replace(/\uFFFD/g, 'º');
                    temperature.textContent = sensorAverages[sensor].temperature;
                    humidity.textContent = sensorAverages[sensor].humidity;

                    sensorRow.appendChild(sensorName);
                    sensorRow.appendChild(temperature);
                    sensorRow.appendChild(humidity);
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



// Função para processar um arquivo .csv e calcular as médias de temperatura e umidade para cada sensor
function processCsvFile(file) {
    console.log('processCsvFile called with', file.name);
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            complete: (results) => {
                const sensorData = {};

                // Itera sobre cada linha do arquivo e extrai a temperatura e a umidade
                for (const row of results.data) {
                    const { temperature, humidity } = extractTemperatureAndHumidityFromFormattedValue(row['Formatted Value']);

                    // Agrupa os valores por sensor
                    if (!sensorData[row['Sensor Name']]) {
                        sensorData[row['Sensor Name']] = {
                            temperatureValues: [],
                            humidityValues: [],
                        };
                    }

                    if (temperature) {
                        sensorData[row['Sensor Name']].temperatureValues.push(temperature);
                    }

                    if (humidity) {
                        sensorData[row['Sensor Name']].humidityValues.push(humidity);
                    }
                }

                // Calcula as médias de temperatura e umidade para cada sensor
                const sensorAverages = {};
                for (const sensor in sensorData) {
                    const temperatureSum = sensorData[sensor].temperatureValues.reduce((total, value) => total + value, 0);
                    const temperatureCount = sensorData[sensor].temperatureValues.length;
                    const temperatureAverage = temperatureSum / temperatureCount;

                    const humiditySum = sensorData[sensor].humidityValues.reduce((total, value) => total + value, 0);
                    const humidityCount = sensorData[sensor].humidityValues.length;
                    const humidityAverage = humiditySum / humidityCount;

                    sensorAverages[sensor] = {
                        temperature: temperatureAverage.toFixed(2),
                        humidity: humidityAverage.toFixed(2),
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
    return Promise.all(Array.from(files).map(processCsvFile))
      .then((results) => {
        // Combina os resultados de cada arquivo em um único objeto
        const combinedData = results.reduce((combined, current) => {
          for (const sensor in current) {
            if (!combined[sensor]) {
              combined[sensor] = {
                temperatureValues: [],
                humidityValues: [],
                dates: [], // adiciona um array para armazenar as datas
              };
            }
            combined[sensor].temperatureValues.push(parseFloat(current[sensor].temperature));
            combined[sensor].humidityValues.push(parseFloat(current[sensor].humidity));
            combined[sensor].dates.push(new Date(current[sensor].dates)); // adiciona a data ao array
          }
          return combined;
        }, {});
  
        // Calcula as médias de temperatura e umidade para cada sensor
        const sensorAverages = {};
        for (const sensor in combinedData) {
          const temperatureSum = combinedData[sensor].temperatureValues.reduce((total, value) => total + value, 0);
          const temperatureCount = combinedData[sensor].temperatureValues.length;
          const temperatureAverage = temperatureSum / temperatureCount;
  
          const humiditySum = combinedData[sensor].humidityValues.reduce((total, value) => total + value, 0);
          const humidityCount = combinedData[sensor].humidityValues.length;
          const humidityAverage = humiditySum / humidityCount;
  
          // Encontra a data mínima e máxima
          const dates = combinedData[sensor].dates;
          const minDate = new Date(Math.min(...dates));
          const maxDate = new Date(Math.max(...dates));
  
          sensorAverages[sensor] = {
            temperature: temperatureAverage.toFixed(2),
            humidity: humidityAverage.toFixed(2),
            minDate,
            maxDate,
          };
        }
  
        return sensorAverages;
      });
  }

  