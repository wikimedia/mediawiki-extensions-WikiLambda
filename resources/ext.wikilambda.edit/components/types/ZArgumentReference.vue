<template>
	<!--
		WikiLambda Vue component for ZArgumentReference objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<select
			v-if="!viewmode"
			v-model="selectedArgument"
			class="ext-wikilambda-zargument-reference"
		>
			<option value="" disabled>
				{{ $i18n( "wikilambda-argref-default-label" ).text() }}
			</option>
			<option
				v-for="argument in getZarguments"
				:key="argument.zid"
				:value="argument.zid"
			>
				{{ getCurrentLanguageLabel( argument.labels ).label }}
			</option>
		</select>
		<template v-else>
			{{ getCurrentLanguageLabel( getZarguments[ selectedArgument ].labels ).label }}
		</template>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	mixins: [ typeUtils ],
	inject: {
		viewmode: { default: false }
	},
	props: {
		zobjectId: {
			type: Number,
			required: true
		}
	},
	computed: $.extend( {},
		mapGetters( {
			getZObjectChildrenById: 'getZObjectChildrenById',
			getZarguments: 'getZarguments',
			getCurrentZLanguage: 'getCurrentZLanguage'
		} ),
		{
			zobject: function () {
				return this.getZObjectChildrenById( this.zobjectId );
			},
			zArgumentReferenceKey: function () {
				return this.findKeyInArray(
					Constants.Z_STRING_VALUE,
					this.getZObjectChildrenById(
						this.findKeyInArray( Constants.Z_ARGUMENT_REFERENCE_KEY, this.zobject ).id
					)
				);
			},
			selectedArgument: {
				get: function () {
					return this.zArgumentReferenceKey.value || '';
				},
				set: function ( val ) {
					this.setZObjectValue( {
						id: this.zArgumentReferenceKey.id,
						value: val
					} );
				}
			}
		}
	),
	methods: $.extend( {},
		mapActions( [ 'setZObjectValue' ] ),
		{
			getCurrentLanguageLabel: function ( labels ) {
				var labelInCurrentLanguage = labels.filter( function ( label ) {
					return label.lang === this.getCurrentZLanguage;
				} )[ 0 ];
				var fallbackLanguage = labels[ 0 ];

				return labelInCurrentLanguage || fallbackLanguage;
			}
		}
	)
};
</script>

<style lang="less">
.ext-wikilambda-zargument-reference {
	display: inline-block;
	margin-top: 5px;
}
</style>
