'use client'

import { useEffect, useRef, useState } from 'react'

interface Vector2 {
  x: number
  y: number
}

interface Entity {
  pos: Vector2
  vel: Vector2
  radius: number
  health: number
  maxHealth: number
}

interface Enemy extends Entity {
  type: 'zombie' | 'fast' | 'tank'
}

interface Bullet {
  pos: Vector2
  vel: Vector2
  radius: number
  damage: number
}

interface Particle {
  pos: Vector2
  vel: Vector2
  life: number
  maxLife: number
  color: string
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameOver'>('menu')
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [wave, setWave] = useState(1)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    const keys: { [key: string]: boolean } = {}
    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    let player: Entity = {
      pos: { x: canvas.width / 2, y: canvas.height / 2 },
      vel: { x: 0, y: 0 },
      radius: 15,
      health: 100,
      maxHealth: 100
    }

    let enemies: Enemy[] = []
    let bullets: Bullet[] = []
    let particles: Particle[] = []
    let currentScore = 0
    let currentWave = 1
    let enemiesRemaining = 10
    let shootCooldown = 0
    let gameRunning = false

    const startGame = () => {
      player = {
        pos: { x: canvas.width / 2, y: canvas.height / 2 },
        vel: { x: 0, y: 0 },
        radius: 15,
        health: 100,
        maxHealth: 100
      }
      enemies = []
      bullets = []
      particles = []
      currentScore = 0
      currentWave = 1
      enemiesRemaining = 10
      shootCooldown = 0
      gameRunning = true
      setGameState('playing')
      setScore(0)
      setWave(1)
      spawnWave(1)
    }

    const spawnWave = (waveNum: number) => {
      const count = 10 + waveNum * 5
      enemiesRemaining = count

      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          spawnEnemy(waveNum)
        }, i * 300)
      }
    }

    const spawnEnemy = (waveNum: number) => {
      if (!gameRunning) return

      const side = Math.floor(Math.random() * 4)
      let x = 0, y = 0

      switch (side) {
        case 0: x = Math.random() * canvas.width; y = -30; break
        case 1: x = canvas.width + 30; y = Math.random() * canvas.height; break
        case 2: x = Math.random() * canvas.width; y = canvas.height + 30; break
        case 3: x = -30; y = Math.random() * canvas.height; break
      }

      const rand = Math.random()
      let type: 'zombie' | 'fast' | 'tank'
      let health: number
      let radius: number

      if (rand < 0.7) {
        type = 'zombie'
        health = 30 + waveNum * 10
        radius = 12
      } else if (rand < 0.9) {
        type = 'fast'
        health = 20 + waveNum * 5
        radius = 10
      } else {
        type = 'tank'
        health = 100 + waveNum * 30
        radius = 18
      }

      enemies.push({
        pos: { x, y },
        vel: { x: 0, y: 0 },
        radius,
        health,
        maxHealth: health,
        type
      })
    }

    const createParticles = (pos: Vector2, color: string, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = Math.random() * 3 + 1
        particles.push({
          pos: { ...pos },
          vel: {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
          },
          life: 30,
          maxLife: 30,
          color
        })
      }
    }

    const update = () => {
      if (!gameRunning) return

      // Player movement
      const speed = 5
      player.vel.x = 0
      player.vel.y = 0

      if (keys['w'] || keys['arrowup']) player.vel.y = -speed
      if (keys['s'] || keys['arrowdown']) player.vel.y = speed
      if (keys['a'] || keys['arrowleft']) player.vel.x = -speed
      if (keys['d'] || keys['arrowright']) player.vel.x = speed

      if (player.vel.x !== 0 && player.vel.y !== 0) {
        player.vel.x *= 0.707
        player.vel.y *= 0.707
      }

      player.pos.x += player.vel.x
      player.pos.y += player.vel.y

      player.pos.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.pos.x))
      player.pos.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.pos.y))

      // Auto-shoot at nearest enemy
      shootCooldown--
      if (shootCooldown <= 0 && enemies.length > 0) {
        let nearest = enemies[0]
        let nearestDist = Infinity

        for (const enemy of enemies) {
          const dx = enemy.pos.x - player.pos.x
          const dy = enemy.pos.y - player.pos.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < nearestDist) {
            nearestDist = dist
            nearest = enemy
          }
        }

        if (nearest) {
          const dx = nearest.pos.x - player.pos.x
          const dy = nearest.pos.y - player.pos.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          bullets.push({
            pos: { ...player.pos },
            vel: {
              x: (dx / dist) * 12,
              y: (dy / dist) * 12
            },
            radius: 4,
            damage: 25
          })

          shootCooldown = 10
        }
      }

      // Update bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i]
        bullet.pos.x += bullet.vel.x
        bullet.pos.y += bullet.vel.y

        if (bullet.pos.x < 0 || bullet.pos.x > canvas.width ||
            bullet.pos.y < 0 || bullet.pos.y > canvas.height) {
          bullets.splice(i, 1)
        }
      }

      // Update enemies
      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i]
        const dx = player.pos.x - enemy.pos.x
        const dy = player.pos.y - enemy.pos.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        let speed = 1.5
        if (enemy.type === 'fast') speed = 2.5
        if (enemy.type === 'tank') speed = 1

        enemy.vel.x = (dx / dist) * speed
        enemy.vel.y = (dy / dist) * speed

        enemy.pos.x += enemy.vel.x
        enemy.pos.y += enemy.vel.y

        // Collision with player
        const playerDist = Math.sqrt(
          Math.pow(enemy.pos.x - player.pos.x, 2) +
          Math.pow(enemy.pos.y - player.pos.y, 2)
        )

        if (playerDist < enemy.radius + player.radius) {
          player.health -= 0.5
          if (player.health <= 0) {
            gameRunning = false
            setGameState('gameOver')
            if (currentScore > highScore) {
              setHighScore(currentScore)
            }
          }
        }

        // Collision with bullets
        for (let j = bullets.length - 1; j >= 0; j--) {
          const bullet = bullets[j]
          const bulletDist = Math.sqrt(
            Math.pow(enemy.pos.x - bullet.pos.x, 2) +
            Math.pow(enemy.pos.y - bullet.pos.y, 2)
          )

          if (bulletDist < enemy.radius + bullet.radius) {
            enemy.health -= bullet.damage
            bullets.splice(j, 1)
            createParticles(bullet.pos, '#ff4444', 5)

            if (enemy.health <= 0) {
              const points = enemy.type === 'tank' ? 50 : enemy.type === 'fast' ? 20 : 10
              currentScore += points
              setScore(currentScore)
              createParticles(enemy.pos, enemy.type === 'tank' ? '#ff00ff' : '#00ff00', 15)
              enemies.splice(i, 1)
              enemiesRemaining--

              if (enemiesRemaining <= 0 && enemies.length === 0) {
                currentWave++
                setWave(currentWave)
                spawnWave(currentWave)
                player.health = Math.min(player.maxHealth, player.health + 20)
              }
              break
            }
          }
        }
      }

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.pos.x += p.vel.x
        p.pos.y += p.vel.y
        p.vel.x *= 0.95
        p.vel.y *= 0.95
        p.life--

        if (p.life <= 0) {
          particles.splice(i, 1)
        }
      }
    }

    const draw = () => {
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw particles
      for (const p of particles) {
        const alpha = p.life / p.maxLife
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0')
        ctx.beginPath()
        ctx.arc(p.pos.x, p.pos.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }

      // Draw bullets
      ctx.fillStyle = '#ffff00'
      for (const bullet of bullets) {
        ctx.beginPath()
        ctx.arc(bullet.pos.x, bullet.pos.y, bullet.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      // Draw enemies
      for (const enemy of enemies) {
        if (enemy.type === 'zombie') ctx.fillStyle = '#00ff00'
        else if (enemy.type === 'fast') ctx.fillStyle = '#ff8800'
        else ctx.fillStyle = '#ff00ff'

        ctx.beginPath()
        ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius, 0, Math.PI * 2)
        ctx.fill()

        // Health bar
        const barWidth = enemy.radius * 2
        const barHeight = 4
        ctx.fillStyle = '#ff0000'
        ctx.fillRect(enemy.pos.x - barWidth / 2, enemy.pos.y - enemy.radius - 10, barWidth, barHeight)
        ctx.fillStyle = '#00ff00'
        ctx.fillRect(enemy.pos.x - barWidth / 2, enemy.pos.y - enemy.radius - 10,
          barWidth * (enemy.health / enemy.maxHealth), barHeight)
      }

      // Draw player
      ctx.fillStyle = '#00aaff'
      ctx.beginPath()
      ctx.arc(player.pos.x, player.pos.y, player.radius, 0, Math.PI * 2)
      ctx.fill()

      // Player health bar
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(10, 10, 304, 34)
      ctx.fillStyle = '#333'
      ctx.fillRect(12, 12, 300, 30)
      ctx.fillStyle = '#ff0000'
      ctx.fillRect(12, 12, 300 * (player.health / player.maxHealth), 30)
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.strokeRect(12, 12, 300, 30)

      // HUD
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 20px monospace'
      ctx.fillText(`HP: ${Math.ceil(player.health)}`, 20, 33)

      ctx.font = 'bold 24px monospace'
      ctx.fillText(`Score: ${currentScore}`, 20, 80)
      ctx.fillText(`Wave: ${currentWave}`, 20, 110)
      ctx.fillText(`Enemies: ${enemies.length}`, 20, 140)
    }

    const gameLoop = () => {
      if (gameState === 'playing') {
        update()
        draw()
      }
      requestAnimationFrame(gameLoop)
    }

    const handleClick = (e: MouseEvent) => {
      if (gameState === 'menu') {
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        const buttonX = canvas.width / 2 - 100
        const buttonY = canvas.height / 2 - 25

        if (x >= buttonX && x <= buttonX + 200 &&
            y >= buttonY && y <= buttonY + 50) {
          startGame()
        }
      } else if (gameState === 'gameOver') {
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        const buttonX = canvas.width / 2 - 100
        const buttonY = canvas.height / 2 + 50

        if (x >= buttonX && x <= buttonX + 200 &&
            y >= buttonY && y <= buttonY + 50) {
          startGame()
        }
      }
    }

    canvas.addEventListener('click', handleClick)

    const drawMenu = () => {
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = '#00aaff'
      ctx.font = 'bold 64px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('PIXEL SURVIVORS', canvas.width / 2, canvas.height / 2 - 100)

      ctx.fillStyle = '#fff'
      ctx.font = '24px monospace'
      ctx.fillText('Survive the endless horde!', canvas.width / 2, canvas.height / 2 - 40)

      ctx.fillStyle = '#00ff00'
      ctx.fillRect(canvas.width / 2 - 100, canvas.height / 2 - 25, 200, 50)
      ctx.fillStyle = '#000'
      ctx.font = 'bold 28px monospace'
      ctx.fillText('PLAY', canvas.width / 2, canvas.height / 2 + 8)

      ctx.fillStyle = '#888'
      ctx.font = '18px monospace'
      ctx.fillText('WASD or Arrow Keys to move', canvas.width / 2, canvas.height / 2 + 80)
      ctx.fillText('Auto-shoot at enemies', canvas.width / 2, canvas.height / 2 + 110)

      if (highScore > 0) {
        ctx.fillStyle = '#ffff00'
        ctx.font = 'bold 20px monospace'
        ctx.fillText(`High Score: ${highScore}`, canvas.width / 2, canvas.height - 50)
      }

      ctx.textAlign = 'left'
    }

    const drawGameOver = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = '#ff0000'
      ctx.font = 'bold 64px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 100)

      ctx.fillStyle = '#fff'
      ctx.font = '32px monospace'
      ctx.fillText(`Score: ${currentScore}`, canvas.width / 2, canvas.height / 2 - 30)
      ctx.fillText(`Wave: ${currentWave}`, canvas.width / 2, canvas.height / 2 + 10)

      ctx.fillStyle = '#00ff00'
      ctx.fillRect(canvas.width / 2 - 100, canvas.height / 2 + 50, 200, 50)
      ctx.fillStyle = '#000'
      ctx.font = 'bold 28px monospace'
      ctx.fillText('RETRY', canvas.width / 2, canvas.height / 2 + 83)

      ctx.textAlign = 'left'
    }

    const menuLoop = () => {
      if (gameState === 'menu') {
        drawMenu()
      } else if (gameState === 'gameOver') {
        drawGameOver()
      }
      requestAnimationFrame(menuLoop)
    }

    gameLoop()
    menuLoop()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      canvas.removeEventListener('click', handleClick)
    }
  }, [gameState, highScore])

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  )
}
