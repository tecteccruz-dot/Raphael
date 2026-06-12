export async function llamarIA(config, mensajes) {
  if (!config.proveedor) {
    throw new Error('Proveedor de IA no configurado');
  }

  // Preparamos el payload según formato OpenAI (usado por Azure y LM Studio también)
  const payload = {
    messages: mensajes,
    temperature: 0.7,
    max_tokens: 1500,
  };

  let url = '';
  const headers = {
    'Content-Type': 'application/json'
  };

  if (config.proveedor === 'azure') {
    if (!config.resourceName || !config.deploymentId || !config.apiKey) {
      throw new Error('Faltan datos de configuración para Azure OpenAI');
    }
    url = `https://${config.resourceName}.openai.azure.com/openai/deployments/${config.deploymentId}/chat/completions?api-version=${config.apiVersion}`;
    headers['api-key'] = config.apiKey;
    
  } else if (config.proveedor === 'openai') {
    if (!config.apiKey || !config.deploymentId) {
      throw new Error('Faltan datos de configuración para OpenAI');
    }
    url = 'https://api.openai.com/v1/chat/completions';
    headers['Authorization'] = `Bearer ${config.apiKey}`;
    payload.model = config.deploymentId;
    
  } else if (config.proveedor === 'groq') {
    if (!config.apiKey) {
      throw new Error('Falta la API Key de Groq');
    }
    url = 'https://api.groq.com/openai/v1/chat/completions';
    headers['Authorization'] = `Bearer ${config.apiKey}`;
    payload.model = config.deploymentId || 'llama-3.3-70b-versatile';

  } else if (config.proveedor === 'gemini') {
    if (!config.apiKey) {
      throw new Error('Falta la API Key de Google Gemini');
    }
    // Google ofrece un endpoint compatible con el formato OpenAI
    url = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    headers['Authorization'] = `Bearer ${config.apiKey}`;
    payload.model = config.deploymentId || 'gemini-2.5-flash';

  } else if (config.proveedor === 'lmstudio') {
    if (!config.endpointUrl) {
      throw new Error('Falta URL para LM Studio');
    }
    url = `${config.endpointUrl.replace(/\/+$/, '')}/v1/chat/completions`;
    // LM Studio a veces ignora el modelo, pero se lo pasamos por compatibilidad
    payload.model = 'local-model'; 
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Error API (${response.status}): ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    } else {
      throw new Error('Respuesta vacía de la API');
    }
    
  } catch (error) {
    console.error('Error llamando a IA:', error);
    throw error;
  }
}

// Función auxiliar para probar conexión (manda un ping muy barato)
export async function probarConexion(config) {
  try {
    await llamarIA(config, [{ role: 'user', content: 'Responde solo con la palabra OK.' }]);
    return { exito: true, mensaje: 'Conexión exitosa' };
  } catch (error) {
    return { exito: false, mensaje: error.message };
  }
}
