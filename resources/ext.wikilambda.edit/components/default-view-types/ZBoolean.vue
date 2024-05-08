<!--
	WikiLambda Vue component for boolean values

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-boolean">
		<template v-if="!edit">
			<a
				class="ext-wikilambda-edit-link"
				:href="valueUrl"
			>
				{{ valueLabel }}
			</a>
		</template>
		<template v-else>
			<cdx-radio
				v-for="radio in radioChoices"
				:key="'radio-' + radio.value"
				v-model="value"
				:input-value="radio.value"
				:name="'boolean-radios-' + rowId"
				:inline="true"
			>
				{{ radio.label }}
			</cdx-radio>
		</template>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const CdxRadio = require( '@wikimedia/codex' ).CdxRadio,
	Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = exports = defineComponent( {
	name: 'wl-z-boolean',
	components: {
		'cdx-radio': CdxRadio
	},
	props: {
		rowId: {
			type: Number,
			required: false,
			default: 0
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	computed: Object.assign( mapGetters( [
		'getLabel',
		'getZBooleanValue'
	] ),
	{
		value: {
			get: function () {
				return this.getZBooleanValue( this.rowId );
			},
			set: function ( value ) {
				this.$emit( 'set-value', {
					keyPath: [
						Constants.Z_BOOLEAN_IDENTITY,
						Constants.Z_REFERENCE_ID
					],
					value
				} );
			}
		},
		valueLabel: function () {
			return this.getLabel( this.value );
		},
		valueUrl: function () {
			return '/view/' + ( mw.language.getFallbackLanguageChain()[ 0 ] || 'en' ) + '/' + this.value;
		},
		radioChoices: function () {
			return [
				{
					label: this.getLabel( Constants.Z_BOOLEAN_TRUE ),
					value: Constants.Z_BOOLEAN_TRUE
				},
				{
					label: this.getLabel( Constants.Z_BOOLEAN_FALSE ),
					value: Constants.Z_BOOLEAN_FALSE
				}
			];
		}
	} )
} );
</script>
