<template>
	<div class="ext-wikilambda-table" :data-has-border="isBordered" :data-is-expandable="isExpandable">
		<div v-if="title" class="ext-wikilambda-table__title">
			{{ title }}
		</div>
		<div class="ext-wikilambda-table__content" :style="gridStyleVariables">
			<div class="ext-wikilambda-table__content__header ext-wikilambda-table__content__row">
				<div v-for="( n, i ) in header" :key="i"
					class="ext-wikilambda-table__content__row__item ext-wikilambda-table__content__row__item--header"
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
				<div
					v-for="( _, item ) in header"
					:key="item"
					class="ext-wikilambda-table__content__row__item"
				>
					<template v-if="n[ item ].component">
						<component :is="n[ item ].component" v-bind="n[ item ].props">
							{{ n[ item ].title || "" }}
						</component>
					</template>
					<template v-else>
						{{ n[ item ].title || n[ item ] }}
					</template>
				</div>

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
	icons = require( '../../../lib/icons.json' ),
	Chip = require( './Chip.vue' );

// @vue/component
module.exports = exports = {
	name: 'table-container',
	components: {
		'cdx-icon': CdxIcon,
		chip: Chip
	},
	props: {
		title: {
			type: String,
			default: ''
		},
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
		padding: 15px 16px;
		color: @wmui-color-base0;
		font-weight: @font-weight-bold;
		white-space: nowrap;
		background-color: @wmui-color-base80;
	}

	&__content {
		display: grid;
		grid-auto-rows: 54px;
		position: relative;
		grid-template-columns: repeat( var( --header-length ), minmax( -webkit-max-content, 1fr ) );
		grid-template-columns: repeat( var( --header-length ), minmax( max-content, 1fr ) );

		&__row {
			display: contents;

			&__item {
				display: flex;
				align-items: center;
				border-top: 1px solid @wmui-color-base80;
				padding: 0 15px;
				text-transform: capitalize;

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
			grid-auto-rows: 41px;

			.ext-wikilambda-table__content__row__item {
				font-weight: @font-weight-bold;
				background-color: @wmui-color-base90;
				border-top: 1px solid @wmui-color-base80;
				border-right: 1px solid @wmui-color-base80;
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
