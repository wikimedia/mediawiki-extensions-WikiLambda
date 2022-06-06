<template>
	<!--
		WikiLambda Vue component for viewing a function examples.

		@copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div
		class="ext-wikilambda-table"
		:data-has-border="isBordered"
	>
		<div class="ext-wikilambda-table__title">
			<slot name="table-title"></slot>
		</div>
		<table class="ext-wikilambda-table__content">
			<thead v-if="!hideHeader" class="ext-wikilambda-table__content__header ext-wikilambda-table__content__row">
				<tr>
					<th
						v-for="( n, i ) in header"
						:key="i"
						class="ext-wikilambda-table__content__row__item ext-wikilambda-table__content__row__item--header"
						:class="n.class"
					>
						<template v-if="n.component">
							<component :is="n.component" v-bind="n.props">
								{{ n.title || "" }}
							</component>
						</template>
						<template v-else>
							{{ n.title || n.title === '' ? n.title : n }}
						</template>
					</th>
				</tr>
			</thead>

			<tbody>
				<tr
					v-for="( n, i ) in body"
					:key="i"
					class="ext-wikilambda-table__content__row">
					<template v-for="( _, item ) in header">
						<td
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
						</td>
					</template>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<script>
var CdxCheckbox = require( '@wikimedia/codex' ).CdxCheckbox,
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	Chip = require( './Chip.vue' );

// @vue/component
module.exports = exports = {
	name: 'table-container',
	components: {
		'cdx-button': CdxButton,
		'cdx-checkbox': CdxCheckbox,
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
		isBordered: {
			type: Boolean,
			default: false
		}
	}
};
</script>

<style lang="less">
@import './../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-table {
	border: 1px solid @wmui-color-base80;

	&__title {
		white-space: nowrap;
	}

	&__content {
		position: relative;
		width: -webkit-fill-available;
		border-collapse: collapse;

		&__row {
			&__item {
				padding-top: 12px;
				padding-bottom: 12px;
				align-items: center;
				border-top: 1px solid @wmui-color-base80;

				&:last-child {
					border-right: 0;
				}
			}
		}

		&__header {
			.ext-wikilambda-table__content__row__item {
				border-top: 0;
				white-space: nowrap;

				&--header {
					text-align: left;
				}
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
}
</style>
