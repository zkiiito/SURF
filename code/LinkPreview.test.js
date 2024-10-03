import linkPreview from './LinkPreview.js';
const url = process.argv[2];
/*
https://onezero.medium.com/states-ditch-surveillance-firm-banjo-after-ceos-kkk-past-is-revealed-acebaefea17f
https://haveibeenpwned.com/
https://www.thelancet.com/pdfs/journals/lanres/PIIS2213-2600(20)30116-8.pdf
https://www.g2a.com/terraforming-mars-steam-key-global-i10000174442003
https://seekingalpha.com/symbol/SPG/dividends/scorecard
https://www.linkedin.com/in/felhobacsi/?originalSubdomain=hu
 */

linkPreview.fetchData(url)
    .then(data => {
        console.log('result:', data);
        process.exit();
    })
    .catch(e => {
        console.log('error:', e);
        process.exit();
    });
