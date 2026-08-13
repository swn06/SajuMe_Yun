import { mascotLine, mascotSrc } from '../../lib/mascot.js'
import './Mascot.css'

export default function Mascot({
  pose = 'bow',
  size = 'md',
  line = false,
  still = false,
  className = '',
  alt = '',
}) {
  const caption = line === true ? mascotLine(pose) : line || ''

  return (
    <figure
      className={`mascot mascot--${size}${still ? ' mascot--still' : ''}${className ? ` ${className}` : ''}`}
    >
      <img
        className="mascot__sprite"
        src={mascotSrc(pose)}
        alt={alt}
        draggable={false}
      />
      {caption ? <figcaption className="mascot__line">{caption}</figcaption> : null}
    </figure>
  )
}
