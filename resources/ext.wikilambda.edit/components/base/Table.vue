<template>
	<div
		class="ext-wikilambda-table"
		:data-has-border="isBordered"
		:data-is-expandable="isExpandable"
	>
		<div class="ext-wikilambda-table__title">
			<slot name="table-title"></slot>
		</div>
		<div class="ext-wikilambda-table__content" :style="gridStyleVariables">
			<div v-if="!hideHeader" class="ext-wikilambda-table__content__header ext-wikilambda-table__content__row">
				<div
					v-for="( n, i ) in header"
					:key="i"
					class="ext-wikilambda-table__content__row__item ext-wikilambda-table__content__row__item--header"
					:class="n.class"
				>
					{{ n.title || n }}
				</div>

				<span v-if="isExpandable" class="ext-wikilambda-table__content__row__item">
				</span>
			</div>

			<div
				v-for="( n, i ) in body"
				:key="i"
				class="ext-wikilambda-table__content__row"
			>
				<template v-for="( _, item ) in header">
					<div
						v-if="n && item in n"
						:key="item"
						class="ext-wikilambda-table__content__row__item"
						:class="n[ item ] ? n[ item ].class : ''"
					>
						<template v-if="n[ item ].component">
							<component :is="n[ item ].component" v-bind="n[ item ].props">
								{{ n[ item ].title || "" }}
							</component>
						</template>
						<template v-else>
							{{ n[ item ].title || n[ item ].title === '' ? n[ item ].title : n[ item ] }}
						</template>
					</div>
				</template>

				<template v-if="isExpandable">
					<div class="ext-wikilambda-table__content__row__item">
						<cdx-icon
							class="ext-wikilambda-table__content__row__item__icon"
							:class="{ 'ext-wikilambda-table__content__row__item__icon--active': itemExpandedIndex === i }"
							:icon="icons.cdxIconExpand"
							@click="() => toggleExpandItem( i )"
						>
						</cdx-icon>
					</div>
					<div
						v-if="itemExpandedIndex === i"
						class="ext-wikilambda-table__content__row__item-expand"
					>
					</div>
				</template>
			</div>
		</div>
	</div>
</template>

<script>
var CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	icons = require( '../../../lib/icons.json' ),
	Chip = require( './Chip.vue' );

// @vue/component
module.exports = exports = {
	name: 'table-container',
	components: {
		'cdx-icon': CdxIcon,
		'cdx-button': CdxButton,
		chip: Chip
	},
	props: {
		header: { // example: { language: "Language" } or { language: { title: "Language" mobile: false } }
			type: Object,
			required: true
		},
		body: { // example: { language: "Language" } or { language: { title: "Language" component: 'chip', props: { text: 'active' } } }
			type: Array,
			default: function () {
				return [];
			}
		},
		hideHeader: {
			type: Boolean,
			default: false
		},
		isExpandable: {
			type: Boolean,
			default: false
		},
		isBordered: {
			type: Boolean,
			default: false
		}
	},
	data: function () {
		return {
			icons: icons,
			itemExpandedIndex: -1 // assign expanded body index
		};
	},
	computed: {
		headerLength: function () {
			return Object.keys( this.header ).length;
		},
		gridStyleVariables: function () {
			var headerLength = this.headerLength;
			var expandableHeaderLength = headerLength;
			if ( this.isExpandable ) {
				expandableHeaderLength = headerLength + 1;
			}
			return {
				'--header-length': headerLength,
				'--expandable-header-length': expandableHeaderLength
			};
		}
	},
	methods: {
		toggleExpandItem: function ( i ) {
			// close item child if current item is itemExpandedIndex
			if ( this.itemExpandedIndex === i ) {
				this.itemExpandedIndex = -1;
				return;
			}

			this.itemExpandedIndex = i;
		}
	}
};
</script>

<style lang="less">
@import './../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-table {
	display: table;
	border: 1px solid @wmui-color-base80;

	&__title {
		display: table-caption;
		white-space: nowrap;
	}

	&__content {
		display: grid;
		position: relative;
		grid-template-columns: repeat( var( --header-length ), minmax( -webkit-max-content, ~'calc( 100% / var( --header-length ) )' ) );
		grid-template-columns: repeat( var( --header-length ), minmax( max-content, ~'calc( 100% / var( --header-length ) )' ) );

		&__row {
			display: contents;

			&__item {
				display: flex;
				height: 54px;
				align-items: center;
				border-top: 1px solid @wmui-color-base80;

				&__icon {
					cursor: pointer;

					&--active {
						transform: rotate( 180deg );
					}

					svg {
						height: 15px;
					}
				}

				&:last-child {
					border-right: 0;
				}

				&-expand {
					grid-column: span var( --expandable-header-length );
				}
			}
		}

		&__header {
			.ext-wikilambda-table__content__row__item {
				height: 41px;
			}

			div.ext-wikilambda-table__content__row__item--header:last-of-type {
				border-right: 0;
			}
		}
	}

	&[ data-has-border='true' ] {
		.ext-wikilambda-table__content .ext-wikilambda-table__content__row__item {
			border-top: 1px solid @wmui-color-base80;
			border-right: 1px solid @wmui-color-base80;
		}

		.ext-wikilambda-table__content .ext-wikilambda-table__content__row__item:last-child {
			border-right: 0;
		}
	}

	&[ data-is-expandable='true' ] {
		.ext-wikilambda-table__content {
			grid-template-columns: repeat( var( --header-length ), minmax( -webkit-max-content, 1fr ) ) 50px;
			grid-template-columns: repeat( var( --header-length ), minmax( max-content, 1fr ) ) 50px;
		}
	}
}
</style>
