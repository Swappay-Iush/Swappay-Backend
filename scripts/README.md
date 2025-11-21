# Scripts de Migración - SwappCoins

## 📋 Script de Recompensa de Perfil Completo

### `migrateProfileRewards.js`

Este script otorga automáticamente **+200 SwappCoins** a todos los usuarios que ya tienen su perfil completo pero que aún no han recibido esta recompensa.

---

## 🚀 Cómo ejecutar el script

### **Prerrequisitos:**
1. Asegúrate de que MySQL esté corriendo
2. Asegúrate de que las dependencias estén instaladas (`npm install`)
3. Verifica que el archivo `.env` tenga la configuración correcta de la base de datos

### **Ejecución:**

```bash
# Opción 1: Usando el script de npm
npm run migrate:profile-rewards

# Opción 2: Directamente con Node
node scripts/migrateProfileRewards.js
```

---

## 📊 ¿Qué hace el script?

1. **Conecta a la base de datos**
2. **Busca usuarios** que cumplan con:
   - `profileCompletedReward = false` (no han recibido el bono)
3. **Verifica si el perfil está completo:**
   - ✅ `city` (lleno)
   - ✅ `phone` (lleno)
   - ✅ `address` (lleno)
   - ✅ `gender` (lleno)
   - ✅ `dateBirth` (lleno)
4. **Si el perfil está completo:**
   - Suma +200 SwappCoins
   - Marca `profileCompletedReward = true`
5. **Muestra un resumen:**
   - Usuarios actualizados
   - Usuarios sin cambios

---

## 📝 Ejemplo de salida

```
🔍 Iniciando migración de recompensas de perfil completo...

✅ Conexión a la base de datos establecida.

📊 Total de usuarios encontrados: 15

✅ Usuario ID 3 (Juan Pérez): +200 SwappCoins otorgados. Nuevo saldo: 300
✅ Usuario ID 7 (María García): +200 SwappCoins otorgados. Nuevo saldo: 250
✅ Usuario ID 12 (Carlos López): +200 SwappCoins otorgados. Nuevo saldo: 400

📈 Resumen de la migración:
   - Usuarios con perfil completo actualizados: 3
   - Usuarios con perfil incompleto (sin cambios): 12
   - Total procesado: 15

✅ Migración completada exitosamente.
```

---

## ⚠️ Importante

- Este script es **idempotente**: Puedes ejecutarlo múltiples veces sin problemas
- Solo otorga la recompensa UNA vez por usuario
- No afecta a usuarios que ya tienen `profileCompletedReward = true`
- **Recomendación:** Ejecutar este script **UNA SOLA VEZ** después de implementar el sistema de SwappCoins

---

## 🔄 ¿Cuándo ejecutar este script?

- **Primera vez:** Después de implementar el sistema de SwappCoins en producción
- **Migración de datos:** Si ya tienes usuarios registrados con perfiles completos
- **Nunca más:** El sistema automático en `userController.js` se encargará de los nuevos usuarios

---

## 🛡️ Seguridad

El script:
- ✅ No modifica contraseñas
- ✅ No elimina usuarios
- ✅ Solo actualiza `swappcoins` y `profileCompletedReward`
- ✅ Tiene manejo de errores
- ✅ Cierra la conexión automáticamente
