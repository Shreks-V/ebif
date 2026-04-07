"""
Configuracion de pytest para pruebas de login.
"""
import sys
import os

# Agregar el directorio backend al path para imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))
