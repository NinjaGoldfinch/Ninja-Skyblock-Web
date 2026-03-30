interface PlayerHeadProps {
  uuid: string
  size?: number
  className?: string
}

export function PlayerHead({ uuid, size = 32, className = '' }: PlayerHeadProps) {
  return (
    <div className={`relative inline-block ${className}`}>
      <img
        src={`https://mc-heads.net/avatar/${uuid}/${size}`}
        alt="Player head"
        width={size}
        height={size}
        className="rounded-lg shadow-md shadow-black/30 ring-1 ring-dungeon/50"
        style={{ imageRendering: 'pixelated' }}
        loading="lazy"
      />
    </div>
  )
}
