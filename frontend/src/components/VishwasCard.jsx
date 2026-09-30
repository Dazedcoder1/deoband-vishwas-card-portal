import { QRCodeSVG } from 'qrcode.react';

// Official card artwork (1011 × 639 px). The Card ID box and QR square are overlaid
// using percentages measured on that artwork, so it scales to any width.
const ID_BOX = { left: '5.74%', top: '77.31%', width: '27.4%', height: '7.51%' };
const QR_BOX = { left: '80.71%', top: '71.67%', width: '10.58%', height: '16.59%' };

export default function VishwasCard({ cardId, verifyUrl, className = '', placeholder = false }) {
  const showId = cardId && !placeholder;
  return (
    <div className={`relative w-full select-none [container-type:inline-size] ${className}`} style={{ aspectRatio: '1011 / 639' }}>
      <img
        src="/card-template.png"
        alt={showId ? `Deoband Vishwas Card ${cardId}` : 'Deoband Vishwas Card'}
        className="absolute inset-0 w-full h-full object-cover"
        draggable="false"
      />
      {showId && (
        <div
          className="absolute bg-white flex items-center rounded-[0.6cqw] px-[1.2cqw]"
          style={ID_BOX}
        >
          <span className="font-extrabold text-[#111] leading-none whitespace-nowrap" style={{ fontSize: '2.75cqw' }}>
            {cardId}
          </span>
        </div>
      )}
      {showId && verifyUrl && (
        <div className="absolute bg-white p-[0.3cqw]" style={QR_BOX}>
          <QRCodeSVG value={verifyUrl} level="M" marginSize={0} className="w-full h-full" title={`Verify ${cardId}`} />
        </div>
      )}
    </div>
  );
}
