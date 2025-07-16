| Estado actual        | Símbolo de entrada      | Estado siguiente         | Descripción breve                                         |
|----------------------|------------------------|-------------------------|-----------------------------------------------------------|
| ESPERA_USUARIO       | usuario_ingresa        | INGRESO_USUARIO         | Usuario ingresa texto, PDF o imagen                       |
| INGRESO_USUARIO      | sistema_valida_vacio   | VALIDA_VACIO            | Sistema valida si los campos están vacíos                 |
| VALIDA_VACIO         | vacio                  | ESPERA_USUARIO          | Si está vacío, vuelve a esperar entrada                   |
| VALIDA_VACIO         | no_vacio               | VALIDA_LIMITE           | Si no está vacío, valida límite de palabras               |
| VALIDA_LIMITE        | supera_limite          | ESPERA_USUARIO          | Si supera el límite, vuelve a esperar entrada             |
| VALIDA_LIMITE        | limite_ok              | ANALISIS_SISTEMA        | Si está dentro del límite, analiza información            |
| ANALISIS_SISTEMA     | sistema_detecta_spam   | RESULTADO_SISTEMA       | Sistema detecta y muestra cantidad de spam                |
| RESULTADO_SISTEMA    | usuario_reingresa      | ESPERA_USUARIO          | Usuario puede volver a ingresar nueva información         |
