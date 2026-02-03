import './style.css'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 class="text-3xl font-bold text-gray-900">PocketBase + Vue + Tailwind</h1>
      </div>
    </header>
    <main>
      <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div class="bg-white rounded-lg shadow-xl p-8">
          <h2 class="text-4xl font-bold text-gray-900 mb-4">Bem-vindo ao Template</h2>
          <p class="text-xl text-gray-600 mb-8">
            Template completo para projetos com PocketBase + Vue 3 + TypeScript + Tailwind CSS
          </p>
          
          <div class="grid md:grid-cols-3 gap-6 mb-8">
            <div class="p-6 bg-blue-50 rounded-lg">
              <div class="text-blue-600 text-3xl mb-3">🚀</div>
              <h3 class="text-xl font-semibold mb-2">PocketBase</h3>
              <p class="text-gray-600">Backend completo com autenticação, database e API RESTful</p>
            </div>
            
            <div class="p-6 bg-green-50 rounded-lg">
              <div class="text-green-600 text-3xl mb-3">⚡</div>
              <h3 class="text-xl font-semibold mb-2">Vue 3 + TypeScript</h3>
              <p class="text-gray-600">Framework moderno com suporte completo a TypeScript</p>
            </div>
            
            <div class="p-6 bg-purple-50 rounded-lg">
              <div class="text-purple-600 text-3xl mb-3">🎨</div>
              <h3 class="text-xl font-semibold mb-2">Tailwind CSS v4</h3>
              <p class="text-gray-600">Estilização moderna e responsiva</p>
            </div>
          </div>
          
          <div class="flex gap-4">
            <a href="/app/" class="inline-block bg-blue-600 text-white text-lg py-3 px-6 rounded-lg hover:bg-blue-700 transition">
              Acessar App
            </a>
            <a href="https://github.com/edsonlcandido/pocketbase-vue-tailwind-template" target="_blank" class="inline-block bg-gray-200 text-gray-800 text-lg py-3 px-6 rounded-lg hover:bg-gray-300 transition">
              Ver no GitHub
            </a>
          </div>
        </div>
        
        <div class="mt-12 bg-white rounded-lg shadow-xl p-8">
          <h3 class="text-2xl font-bold text-gray-900 mb-4">Características</h3>
          <ul class="space-y-3 text-gray-700">
            <li class="flex items-start">
              <span class="text-green-500 mr-2">✓</span>
              <span>Monorepo com workspaces (Landing Page + Web App)</span>
            </li>
            <li class="flex items-start">
              <span class="text-green-500 mr-2">✓</span>
              <span>Autenticação com PocketBase</span>
            </li>
            <li class="flex items-start">
              <span class="text-green-500 mr-2">✓</span>
              <span>Vue Router com guards de autenticação</span>
            </li>
            <li class="flex items-start">
              <span class="text-green-500 mr-2">✓</span>
              <span>Pinia para gerenciamento de estado</span>
            </li>
            <li class="flex items-start">
              <span class="text-green-500 mr-2">✓</span>
              <span>Vite com proxy configurado</span>
            </li>
            <li class="flex items-start">
              <span class="text-green-500 mr-2">✓</span>
              <span>Dockerfile multi-stage para produção</span>
            </li>
            <li class="flex items-start">
              <span class="text-green-500 mr-2">✓</span>
              <span>Scripts de build e deploy automatizados</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
    <footer class="bg-white mt-12 border-t">
      <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center">
        <p class="text-gray-500">&copy; 2026 PocketBase Vue Tailwind Template. MIT License.</p>
      </div>
    </footer>
  </div>
`
