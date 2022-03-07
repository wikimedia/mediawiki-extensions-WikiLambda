<template>
	<!--
		WikiLambda Vue component for monolingual text

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<div class="ext-wikilambda-cell">
			<cdx-button
				v-if="!( readonly )"
				:title="tooltipRemoveLang"
				:destructive="true"
				@click="removeLang"
			>
				{{ $i18n( 'wikilambda-editor-removeitem' ) }}
			</cdx-button>
			{{ languageLabel }}:
		</div>
		<div class="ext-wikilambda-cell">
			<span
				v-if="readonly"
				class="ext-wikilambda-zstring"
			>
				{{ monolingualStringValue.value }}
			</span>
			<input
				v-else
				class="ext-wikilambda-zstring"
				:value="monolingualStringValue.value"
				@change="updateLangString( $event, monolingualStringValue.id )"
			>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'z-monolingual-string',
	components: {
		'cdx-button': CdxButton
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			required: true
		},
		readonly: {
			type: Boolean,
			default: false
		}
	},
	computed: $.extend( {},
		mapGetters( {
			getZObjectChildrenById: 'getZObjectChildrenById',
			getZkeyLabels: 'getZkeyLabels'
		} ),
		{
			zobject: function () {
				return this.getZObjectChildrenById( this.zobjectId );
			},
			tooltipRemoveLang: function () {
				return this.$i18n( 'wikilambda-editor-label-removelanguage-tooltip' );
			},
			languageLabel: function () {
				return this.getZkeyLabels[ this.monolingualStringLanguage ];
			},
			monolingualStringLanguage: function () {
				var item = this.findKeyInArray( Constants.Z_MONOLINGUALSTRING_LANGUAGE, this.zobject );

				if ( item.value === 'object' ) {
					item = this.findKeyInArray(
						Constants.Z_REFERENCE_ID,
						this.getZObjectChildrenById(
							item.id
						)
					);
				}

				return item.value;
			},
			monolingualStringValue: function () {
				var item = this.findKeyInArray( Constants.Z_MONOLINGUALSTRING_VALUE, this.zobject );

				if ( item.value === 'object' ) {
					item = this.findKeyInArray(
						Constants.Z_STRING_VALUE,
						this.getZObjectChildrenById(
							item.id
						)
					);
				}

				return item;
			}
		}
	),
	methods: $.extend( {},
		mapActions( [ 'setZObjectValue', 'removeZObject', 'removeZObjectChildren', 'fetchZKeys' ] ),
		{
			/**
			 * Remove a specif language and its children from the Zobject
			 *
			 */
			removeLang: function () {
				this.removeZObjectChildren( this.zobjectId );
				this.removeZObject( this.zobjectId );
			},
			/**
			 * Update the Value of a specific Language bu its ID
			 *
			 * @param {Event} event
			 * @param {number} id
			 */
			updateLangString: function ( event, id ) {
				var payload = {
					id: id,
					value: event.target.value
				};
				this.setZObjectValue( payload );
			}
		} ),
	mounted: function () {
		this.fetchZKeys( [ this.monolingualStringLanguage ] );
	}
};
</script>

<style lang="less">
.ext-wikilambda-cell {
	float: left;
	padding: 0;

	.ext-wikilambda-zstring {
		vertical-align: bottom;
		margin-left: 0.5em;
		margin-top: 4px;
	}
}
</style>
