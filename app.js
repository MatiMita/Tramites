// ===================================
// API Client
// ===================================
const API_URL = 'http://167.114.113.202:3000/api';

class APIClient {
    async getTramites(filters = {}) {
        const params = new URLSearchParams();
        if (filters.estado && filters.estado !== 'all') params.append('estado', filters.estado);
        if (filters.funcionario && filters.funcionario !== 'all') params.append('funcionario', filters.funcionario);
        if (filters.search) params.append('search', filters.search);

        const url = `${API_URL}/tramites${params.toString() ? '?' + params.toString() : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al obtener trámites');
        return await response.json();
    }

    async getTramite(id) {
        const response = await fetch(`${API_URL}/tramites/${id}`);
        if (!response.ok) throw new Error('Error al obtener trámite');
        return await response.json();
    }

    async getEstadisticas() {
        const response = await fetch(`${API_URL}/estadisticas`);
        if (!response.ok) throw new Error('Error al obtener estadísticas');
        return await response.json();
    }
}

// ===================================
// Data Management
// ===================================
class TramiteManager {
    constructor() {
        this.apiClient = new APIClient();
        this.tramites = [];
        this.currentView = 'grid';
        this.filters = {
            estado: 'all',
            funcionario: 'all',
            search: ''
        };
        this.currentTramiteId = null;
    }

    async loadTramites() {
        try {
            this.tramites = await this.apiClient.getTramites(this.filters);
            return this.tramites;
        } catch (error) {
            console.error('Error al cargar trámites:', error);
            this.showError('Error al cargar los trámites. Verifica que el servidor esté corriendo.');
            return [];
        }
    }

    async getTramiteWithDetalles(id) {
        try {
            return await this.apiClient.getTramite(id);
        } catch (error) {
            console.error('Error al obtener trámite:', error);
            this.showError('Error al obtener el trámite');
            throw error;
        }
    }

    getTramite(id) {
        return this.tramites.find(t => t.id_tramite === parseInt(id));
    }

    getFilteredTramites() {
        return this.tramites;
    }

    async getStats() {
        try {
            return await this.apiClient.getEstadisticas();
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            return { total: 0, inicio: 0, proceso: 0, finalizado: 0 };
        }
    }

    showError(message) {
        console.error('❌', message);
        alert(message);
    }
}

// ===================================
// UI Manager
// ===================================
class UIManager {
    constructor(tramiteManager) {
        this.manager = tramiteManager;
        this.initializeElements();
        this.attachEventListeners();
        this.render();
    }

    initializeElements() {
        // Filters
        this.searchFilter = document.getElementById('searchFilter');
        this.clearFiltersBtn = document.getElementById('clearFiltersBtn');

        // View toggle
        this.gridViewBtn = document.getElementById('gridViewBtn');
        this.listViewBtn = document.getElementById('listViewBtn');

        // Stats
        this.statInicio = document.getElementById('statInicio');
        this.statProceso = document.getElementById('statProceso');
        this.statFinalizado = document.getElementById('statFinalizado');
        this.statTotal = document.getElementById('statTotal');

        // Containers
        this.tramitesContainer = document.getElementById('tramitesContainer');
        this.emptyState = document.getElementById('emptyState');

        // Modal Detalles
        this.detallesModal = document.getElementById('detallesModal');
        this.closeDetallesModalBtn = document.getElementById('closeDetallesModalBtn');
        this.detallesModalTitle = document.getElementById('detallesModalTitle');
        this.detallesModalSubtitle = document.getElementById('detallesModalSubtitle');
        this.tramiteInfoSection = document.getElementById('tramiteInfoSection');
        this.detallesTimeline = document.getElementById('detallesTimeline');
    }

    attachEventListeners() {
        // Filters
        this.searchFilter.addEventListener('input', (e) => {
            this.manager.filters.search = e.target.value;
            this.render();
        });

        this.clearFiltersBtn.addEventListener('click', () => {
            this.manager.filters = { estado: 'all', funcionario: 'all', search: '' };
            this.searchFilter.value = '';
            this.render();
        });

        // View toggle
        this.gridViewBtn.addEventListener('click', () => this.setView('grid'));
        this.listViewBtn.addEventListener('click', () => this.setView('list'));

        // Detalles modal controls
        this.closeDetallesModalBtn.addEventListener('click', () => this.closeDetallesModal());
        this.detallesModal.querySelector('.modal-overlay').addEventListener('click', () => this.closeDetallesModal());
    }

    setView(view) {
        this.manager.currentView = view;

        if (view === 'grid') {
            this.gridViewBtn.classList.add('active');
            this.listViewBtn.classList.remove('active');
            this.tramitesContainer.classList.remove('list-view');
        } else {
            this.listViewBtn.classList.add('active');
            this.gridViewBtn.classList.remove('active');
            this.tramitesContainer.classList.add('list-view');
        }
    }

    async openDetallesModal(tramiteId) {
        try {
            this.manager.currentTramiteId = tramiteId;
            const data = await this.manager.getTramiteWithDetalles(tramiteId);

            // Actualizar título
            this.detallesModalTitle.textContent = `Trámite: ${data.tramite.cite_tramite}`;
            this.detallesModalSubtitle.textContent = `ID: ${data.tramite.id_tramite}`;

            // Renderizar información completa del trámite
            this.renderTramiteInfoComplete(data.tramite);

            // Renderizar detalles completos
            this.renderDetallesComplete(data.detalles);

            // Mostrar modal
            this.detallesModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        } catch (error) {
            // Error already handled
        }
    }

    closeDetallesModal() {
        this.detallesModal.classList.remove('active');
        document.body.style.overflow = '';
        this.manager.currentTramiteId = null;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString + 'T00:00:00').toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatDateTime(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    renderTramiteInfoComplete(tramite) {
        this.tramiteInfoSection.innerHTML = `
            <div class="tramite-info-complete">
                <div class="info-grid">
                    <div class="info-row">
                        <span class="info-label">Cite Trámite:</span>
                        <span class="info-value">${tramite.cite_tramite || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Nombre Trámite:</span>
                        <span class="info-value">${tramite.nombre_tramite || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Estado Trámite:</span>
                        <span class="status-badge status-${tramite.estado_tramite}">${tramite.estado_tramite || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Estado Registro:</span>
                        <span class="info-value">${tramite.estado_reg || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Nombre Completo:</span>
                        <span class="info-value">${tramite.nombre_completo2 || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Tipo Persona:</span>
                        <span class="info-value">${tramite.tipo_persona || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Número Resolución:</span>
                        <span class="info-value">${tramite.num_resolucion || 'N/A'}</span>
                    </div>
                    <div class="info-row info-row-full">
                        <span class="info-label">Observación:</span>
                        <span class="info-value">${tramite.observacion ? this.escapeHtml(tramite.observacion) : 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderDetallesComplete(detalles) {
        if (detalles.length === 0) {
            this.detallesTimeline.innerHTML = `
                <div class="empty-detalles">
                    <p>No hay movimientos registrados para este trámite.</p>
                </div>
            `;
            return;
        }

        this.detallesTimeline.innerHTML = detalles.map((detalle, index) => {
            return `
                <div class="detalle-complete-card">
                    <div class="detalle-header">
                        <span class="detalle-number">Movimiento #${detalles.length - index}</span>
                        <span class="status-badge status-${detalle.estado_tramite}">${detalle.estado_tramite || 'N/A'}</span>
                    </div>
                    <div class="info-grid">
                        <div class="info-row">
                            <span class="info-label">Cite Trámite:</span>
                            <span class="info-value">${detalle.cite_tramite || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Estado Trámite:</span>
                            <span class="status-badge status-${detalle.estado_tramite}">${detalle.estado_tramite || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Estado Registro:</span>
                            <span class="info-value">${detalle.estado_reg || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Cargo:</span>
                            <span class="info-value">${detalle.cargo || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Email Empresa:</span>
                            <span class="info-value">${detalle.email_empresa || 'N/A'}</span>
                        </div>
                        <div class="info-row info-row-full">
                            <span class="info-label">Descripción:</span>
                            <span class="info-value">${detalle.descripcion ? this.escapeHtml(detalle.descripcion) : 'N/A'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async renderStats() {
        const stats = await this.manager.getStats();
        this.statInicio.textContent = stats.inicio || 0;
        this.statProceso.textContent = stats.proceso || 0;
        this.statFinalizado.textContent = stats.finalizado || 0;
        this.statTotal.textContent = stats.total || 0;
    }

    async renderTramites() {
        // Si no hay búsqueda, mostrar mensaje para que el usuario busque
        if (!this.manager.filters.search || this.manager.filters.search.trim() === '') {
            this.tramitesContainer.style.display = 'none';
            this.emptyState.style.display = 'block';

            // Actualizar el mensaje del empty state
            const emptyStateTitle = this.emptyState.querySelector('h3');
            const emptyStateText = this.emptyState.querySelector('p');

            if (emptyStateTitle) emptyStateTitle.textContent = 'Busca un trámite';
            if (emptyStateText) emptyStateText.textContent = 'Escribe en el buscador para encontrar trámites por ID o CITE';

            return;
        }

        // Si hay búsqueda, cargar y mostrar resultados
        await this.manager.loadTramites();
        const tramites = this.manager.getFilteredTramites();

        if (tramites.length === 0) {
            this.tramitesContainer.style.display = 'none';
            this.emptyState.style.display = 'block';

            // Actualizar el mensaje cuando no hay resultados
            const emptyStateTitle = this.emptyState.querySelector('h3');
            const emptyStateText = this.emptyState.querySelector('p');

            if (emptyStateTitle) emptyStateTitle.textContent = 'No se encontraron trámites';
            if (emptyStateText) emptyStateText.textContent = `No hay trámites que coincidan con "${this.manager.filters.search}"`;

            return;
        }

        this.tramitesContainer.style.display = 'grid';
        this.emptyState.style.display = 'none';

        this.tramitesContainer.innerHTML = tramites.map(tramite => this.createTramiteCard(tramite)).join('');

        // Attach event listeners to action buttons
        tramites.forEach(tramite => {
            const viewBtn = document.getElementById(`view-${tramite.id_tramite}`);

            if (viewBtn) {
                viewBtn.addEventListener('click', () => this.openDetallesModal(tramite.id_tramite));
            }
        });
    }

    createTramiteCard(tramite) {
        return `
            <div class="tramite-card status-${tramite.estado_tramite}">
                <div class="tramite-header">
                    <div class="tramite-title-row">
                        <h3 class="tramite-title">${this.escapeHtml(tramite.cite_tramite || 'N/A')}</h3>
                    </div>
                    <div class="tramite-actions">
                        <button class="btn-icon" id="view-${tramite.id_tramite}" title="Ver Detalles">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="tramite-info-preview">
                    <div class="info-row-compact">
                        <span class="info-label-compact">ID:</span>
                        <span class="info-value-compact">${tramite.id_tramite || 'N/A'}</span>
                    </div>
                    ${tramite.nombre_tramite ? `
                    <div class="info-row-compact">
                        <span class="info-label-compact">Nombre:</span>
                        <span class="info-value-compact">${tramite.nombre_tramite}</span>
                    </div>
                    ` : ''}
                    <div class="info-row-compact">
                        <span class="info-label-compact">Estado:</span>
                        <span class="status-badge status-${tramite.estado_tramite}">${tramite.estado_tramite || 'N/A'}</span>
                    </div>
                    ${tramite.cargo ? `
                    <div class="info-row-compact">
                        <span class="info-label-compact">Cargo:</span>
                        <span class="info-value-compact">${tramite.cargo}</span>
                    </div>
                    ` : ''}
                    ${tramite.email_empresa ? `
                    <div class="info-row-compact">
                        <span class="info-label-compact">Email:</span>
                        <span class="info-value-compact">${tramite.email_empresa}</span>
                    </div>
                    ` : ''}
                    ${tramite.nombre_completo2 ? `
                    <div class="info-row-compact">
                        <span class="info-label-compact">Propietario:</span>
                        <span class="info-value-compact">${this.escapeHtml(tramite.nombre_completo2)}</span>
                    </div>
                    ` : ''}
                    ${tramite.descripcion ? `
                    <div class="info-row-compact info-row-full">
                        <span class="info-label-compact">Descripción:</span>
                        <span class="info-value-compact">${this.escapeHtml(tramite.descripcion)}</span>
                    </div>
                    ` : ''}
                    ${tramite.observacion ? `
                    <div class="info-row-compact info-row-full">
                        <span class="info-label-compact">Observación:</span>
                        <span class="info-value-compact">${this.escapeHtml(tramite.observacion)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async render() {
        await this.renderStats();
        await this.renderTramites();
    }
}

// ===================================
// Initialize Application
// ===================================
document.addEventListener('DOMContentLoaded', async () => {
    const tramiteManager = new TramiteManager();
    const uiManager = new UIManager(tramiteManager);

    console.log('Sistema de Consulta de Trámites inicializado correctamente');
    console.log('Conectado a la API en:', API_URL);
    console.log('Modo: SOLO LECTURA');
});
