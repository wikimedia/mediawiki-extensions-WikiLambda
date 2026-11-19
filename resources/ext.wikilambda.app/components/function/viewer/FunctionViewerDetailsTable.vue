<!--
	WikiLambda Vue component for the implementations/tests table in the ZFunction Viewer Details tab.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-function-viewer-details-table">
		<cdx-table
			:caption="title"
			:pending="isLoading"
			:columns="columns"
			:data="pageData"
			:paginate="isPaginated"
			server-pagination
			:total-rows="data.length"
			:pagination-size-options="pageSizeOptions"
			:pagination-size-default="pageSize"
			:aria-label="title"
			class="ext-wikilambda-app-function-viewer-details-table___table-container"
			@load-more="onLoadMore"
		>
			<template #header>
				<div v-if="canConnect || canDisconnect">
					<cdx-button
						v-if="!isMobile || canConnect"
						:disabled="!canConnect || isLoading"
						data-testid="connect"
						@click="connect"
					>
						{{ i18n( 'wikilambda-function-details-table-approve' ).text() }}
					</cdx-button>
					<cdx-button
						v-if="!isMobile || canDisconnect"
						:disabled="!canDisconnect || isLoading"
						data-testid="disconnect"
						@click="disconnect"
					>
						{{ i18n( 'wikilambda-function-details-table-deactivate' ).text() }}
					</cdx-button>
				</div>
				<div v-else>
					<a :href="addLink" data-testid="add-link">
						<cdx-button weight="quiet" aria-label="Add">
							<cdx-icon :icon="iconAdd"></cdx-icon>
						</cdx-button>
					</a>
				</div>
			</template>

			<template #thead>
				<thead v-if="columns.length">
					<tr>
						<template v-for="( column, index ) in columns">
							<th
								v-if="column"
								:key="index"
								:class="column.class"
								:colspan="column.colspan"
							>
								<template v-if="column.component">
									<component :is="column.component" v-bind="column.props">
										{{ column.title || "" }}
									</component>
								</template>
								<template v-else>
									{{ column.title || column.title === '' ? column.title : column }}
								</template>
							</th>
						</template>
					</tr>
				</thead>
			</template>

			<template
				v-for="column in columns"
				:key="column.id"
				#[`item-${column.id}`]="{ item }">
				<template v-if="item && item.component">
					<component :is="item.component" v-bind="item.props">
						{{ item.title || "" }}
					</component>
				</template>
				<template v-else>
					{{ item.title || item.title === '' ? item.title : item }}
				</template>
			</template>

			<template #empty-state>
				{{ emptyText }}
			</template>
		</cdx-table>
	</div>
</template>

<script>
const { computed, defineComponent, inject, ref } = require( 'vue' );
const { CdxButton, CdxCheckbox, CdxIcon, CdxInfoChip, CdxTable } = require( '../../../../codex.js' );
const Constants = require( '../../../Constants.js' );
const FunctionTesterTable = require( './FunctionTesterTable.vue' );
const icons = require( '../../../../lib/icons.json' );
const useBreakpoints = require( '../../../composables/useBreakpoints.js' );

// The Implementations and Tests tables share one remembered page size
const PAGE_SIZE_STORAGE_KEY = 'ext-wikilambda-app-function-details-page-size';
const PAGE_SIZE_OPTIONS = [ { value: 5 }, { value: 10 }, { value: 20 }, { value: 50 } ];

module.exports = exports = defineComponent( {
	name: 'wl-function-viewer-details-table-codex',
	components: {
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon,
		'cdx-info-chip': CdxInfoChip,
		'cdx-table': CdxTable,
		'cdx-checkbox': CdxCheckbox,
		'wl-function-tester-table': FunctionTesterTable
	},
	props: {
		columns: {
			type: Array,
			required: false,
			default: function () {
				return [];
			}
		},
		data: {
			type: Array,
			default: function () {
				return [];
			}
		},
		title: {
			type: String,
			required: false,
			default: ''
		},
		emptyText: {
			type: String,
			default: ''
		},
		canConnect: {
			type: Boolean,
			required: true
		},
		canDisconnect: {
			type: Boolean,
			required: true
		},
		isLoading: {
			type: Boolean,
			default: false
		},
		addLink: {
			type: String,
			required: true
		}
	},
	emits: [ 'connect', 'disconnect' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const breakpoint = useBreakpoints( Constants.BREAKPOINTS );

		// Constants
		const iconAdd = icons.cdxIconAdd;
		const pageSizeOptions = PAGE_SIZE_OPTIONS;

		// Pagination
		// CdxTable only reports a change of page size in server-pagination mode,
		// so the table runs in that mode and this component slices the rows.
		// TODO (T445478): Use client-side pagination once CdxTable emits page size changes.
		const storedPageSize = Number( mw.storage.get( PAGE_SIZE_STORAGE_KEY ) );
		const pageSize = ref( PAGE_SIZE_OPTIONS.some( ( option ) => option.value === storedPageSize ) ?
			storedPageSize :
			PAGE_SIZE_OPTIONS[ 0 ].value
		);
		const offset = ref( 0 );

		/**
		 * Whether there are more rows than fit on the smallest page
		 *
		 * @return {boolean}
		 */
		const isPaginated = computed( () => props.data.length > PAGE_SIZE_OPTIONS[ 0 ].value );

		/**
		 * The rows of the current page
		 *
		 * @return {Array}
		 */
		const pageData = computed( () => isPaginated.value ?
			props.data.slice( offset.value, offset.value + pageSize.value ) :
			props.data
		);

		/**
		 * Shows the page that the table asks for, and remembers a new page size
		 *
		 * @param {number} newOffset index of the first row of the page
		 * @param {number} newPageSize number of rows per page
		 */
		function onLoadMore( newOffset, newPageSize ) {
			offset.value = newOffset;
			if ( newPageSize !== pageSize.value ) {
				pageSize.value = newPageSize;
				mw.storage.set( PAGE_SIZE_STORAGE_KEY, String( newPageSize ) );
			}
		}

		// UI display
		/**
		 * Whether the display is of the size of a mobile screen
		 *
		 * @return {boolean}
		 */
		const isMobile = computed( () => breakpoint.current.value === Constants.BREAKPOINT_TYPES.MOBILE );

		// Actions
		/**
		 * Emits an event when the connect button is clicked
		 */
		function connect() {
			emit( 'connect' );
		}

		/**
		 * Emits an event when the disconnect button is clicked
		 */
		function disconnect() {
			emit( 'disconnect' );
		}

		return {
			connect,
			disconnect,
			iconAdd,
			isMobile,
			isPaginated,
			i18n,
			onLoadMore,
			pageData,
			pageSize,
			pageSizeOptions
		};
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-viewer-details-table {
	margin-bottom: @spacing-200;

	.cdx-table.ext-wikilambda-app-function-viewer-details-table___table-container {
		overflow-wrap: unset;

		.cdx-table__table {
			thead th {
				white-space: nowrap;
				overflow-wrap: break-word;
			}

			tbody td a {
				display: -webkit-box;
				width: max-content;
				max-width: 244px;
				-webkit-line-clamp: 2;
				line-clamp: 2;
				-webkit-box-orient: vertical;
				word-break: normal;
				overflow-wrap: anywhere;
				overflow: hidden;
				text-overflow: ellipsis;

				@media screen and ( max-width: @max-width-breakpoint-mobile ) {
					-webkit-line-clamp: 1;
					line-clamp: 1;
				}
			}
		}
	}
}

</style>
